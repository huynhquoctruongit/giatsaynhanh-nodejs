import * as admin from 'firebase-admin';
import { prismaUnscoped, type DB } from '../config/prisma';
import { tenantContext } from '../helpers/context/tenant-context';

let initialized = false;

function initFirebase() {
  if (initialized) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.warn('[FCM] FIREBASE_SERVICE_ACCOUNT not set — push notifications disabled');
    return;
  }
  try {
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    initialized = true;
    console.log('[FCM] Firebase initialized');
  } catch (err) {
    console.error('[FCM] Failed to initialize Firebase:', err);
  }
}

// ===== Nhãn tiệm trên thông báo =====
// Chủ quản lý nhiều tiệm (ADMIN đã liên kết, cùng accountGroupId) nhận thông báo
// của mọi tiệm trên 1 máy → đầu tiêu đề gắn nhãn ngắn (vd "GSN 1", "GSN 2") để
// nhìn là biết tiệm nào, + màu icon riêng mỗi tiệm. Tiệm không liên kết: giữ nguyên.

// Màu icon thông báo (Android) theo thứ tự tiệm trong nhóm.
const SHOP_COLORS = ['#2563eb', '#ea580c', '#16a34a', '#9333ea', '#db2777', '#0891b2'];

/** "Giặt Sấy Nhanh 2" → "GSN 2", "Tiệm 68" → "T 68". */
export function abbreviateShopName(name: string): string {
  const words = name
    .replace(/[đĐ]/g, (c) => (c === 'đ' ? 'd' : 'D'))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  const letters = words.filter((w) => !/^\d+$/.test(w)).map((w) => w[0].toUpperCase()).join('');
  const nums = words.filter((w) => /^\d+$/.test(w)).join(' ');
  return [letters, nums].filter(Boolean).join(' ') || name;
}

/** Nhãn cho các tiệm trong 1 nhóm (đã sắp theo ngày tạo), tránh trùng: GSN + GSN 2 → GSN 1, GSN 2. */
export function buildShopLabels(names: string[]): string[] {
  const labels = names.map(abbreviateShopName);
  const numOf = (l: string) => l.match(/ (\d+)$/)?.[1];
  const base = (l: string) => l.replace(/ \d+$/, '');
  const groups = new Map<string, number[]>();
  labels.forEach((l, i) => groups.set(base(l), [...(groups.get(base(l)) ?? []), i]));
  for (const [b, idxs] of groups) {
    if (idxs.length < 2) continue;
    const used = new Set(idxs.map((i) => numOf(labels[i])).filter(Boolean).map(Number));
    let n = 1;
    for (const i of idxs) {
      if (numOf(labels[i])) continue;
      while (used.has(n)) n++;
      labels[i] = `${b} ${n}`;
      used.add(n);
    }
  }
  return labels.map((l, i) => (labels.indexOf(l) !== i ? `${l} (${i + 1})` : l));
}

interface ShopBadge {
  label: string;
  color: string;
}
const shopBadgeCache = new Map<string, { badge: ShopBadge | null; at: number }>();

export function clearShopBadgeCache() {
  shopBadgeCache.clear();
}

async function shopBadge(shopId: string): Promise<ShopBadge | null> {
  const hit = shopBadgeCache.get(shopId);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.badge;

  const admins = await prismaUnscoped.user.findMany({
    where: { shopId, role: 'ADMIN', isActive: true, accountGroupId: { not: null } },
    select: { accountGroupId: true },
  });
  const groupIds = [...new Set(admins.map((a) => a.accountGroupId!))];
  let badge: ShopBadge | null = null;
  if (groupIds.length) {
    const shops = await prismaUnscoped.shop.findMany({
      where: {
        users: { some: { accountGroupId: { in: groupIds }, role: 'ADMIN', isActive: true } },
      },
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    });
    const idx = shops.findIndex((s) => s.id === shopId);
    if (shops.length > 1 && idx >= 0) {
      const labels = buildShopLabels(shops.map((s) => s.name));
      badge = { label: labels[idx], color: SHOP_COLORS[idx % SHOP_COLORS.length] };
    }
  }
  shopBadgeCache.set(shopId, { badge, at: Date.now() });
  return badge;
}

const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

/** Gỡ token đã chết (app gỡ cài / token xoay vòng) khỏi User + danh sách POS. */
async function removeDeadTokens(dead: string[]) {
  if (!dead.length) return;
  await prismaUnscoped.user.updateMany({ where: { fcmToken: { in: dead } }, data: { fcmToken: null } });
  await removeFromPosLists(dead);
}

/** Gỡ token khỏi danh sách máy POS (ShopSettings.posFcmTokens) của các tiệm, trừ `keepShopId`. */
export async function removeFromPosLists(tokens: string[], keepShopId?: string) {
  if (!tokens.length) return;
  const rows = await prismaUnscoped.shopSettings.findMany({
    where: { posFcmTokens: { hasSome: tokens }, ...(keepShopId ? { shopId: { not: keepShopId } } : {}) },
    select: { shopId: true, posFcmTokens: true },
  });
  for (const r of rows) {
    await prismaUnscoped.shopSettings.update({
      where: { shopId: r.shopId },
      data: { posFcmTokens: r.posFcmTokens.filter((t) => !tokens.includes(t)) },
    });
  }
}

/**
 * Gửi push notification đến nhiều thiết bị (fire-and-forget, không throw).
 * `shopId`: tiệm phát sinh thông báo — mặc định lấy từ tenant context; route
 * không có context (webhook) phải truyền tường minh.
 */
export async function sendPush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
  opts?: { shopId?: string },
): Promise<void> {
  // Nhiều user dùng chung 1 máy → trùng token → máy nhận 2 lần. Lọc trùng.
  const unique = [...new Set(tokens.filter(Boolean))];
  if (!unique.length) return;
  initFirebase();
  if (!initialized) return;

  try {
    const shopId = opts?.shopId ?? tenantContext.getStore()?.shopId;
    const badge = shopId ? await shopBadge(shopId).catch(() => null) : null;
    const result = await admin.messaging().sendEachForMulticast({
      tokens: unique,
      // Nhãn đứng ĐẦU tiêu đề → thấy ngay cả khi thông báo đang thu gọn.
      notification: { title: badge ? `[${badge.label}] ${title}` : title, body },
      data: {
        ...data,
        ...(shopId ? { shopId } : {}),
        ...(badge ? { shopLabel: badge.label } : {}),
      },
      android: {
        priority: 'high',
        ...(badge ? { notification: { color: badge.color } } : {}),
      },
    });
    console.log(`[FCM] Sent ${result.successCount}/${unique.length} — fail: ${result.failureCount}`);
    const dead = result.responses
      .map((r, i) => (!r.success && r.error && DEAD_TOKEN_CODES.has(r.error.code) ? unique[i] : null))
      .filter((t): t is string => !!t);
    await removeDeadTokens(dead);
  } catch (err) {
    console.error('[FCM] sendPush error:', err);
  }
}

/** Lấy FCM token của tất cả user đang active (trong đúng tenant context hiện tại) */
export async function getActiveTokens(prisma: DB): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { isActive: true, fcmToken: { not: null } },
    select: { fcmToken: true },
  });
  return users.map((u) => u.fcmToken!).filter(Boolean);
}

/**
 * Gửi thông báo cho các tài khoản ADMIN (chủ tiệm) của tiệm hiện tại.
 * `excludeUserId`: người thực hiện — chủ tiệm tự thao tác thì không báo về chính máy mình.
 * Fire-and-forget: lỗi gửi không làm hỏng nghiệp vụ.
 */
export async function notifyAdmins(
  prisma: DB,
  title: string,
  body: string,
  data?: Record<string, string>,
  excludeUserId?: string,
): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        isActive: true,
        fcmToken: { not: null },
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { fcmToken: true },
    });
    await sendPush(admins.map((a) => a.fcmToken!).filter(Boolean), title, body, data);
  } catch (err) {
    console.error('[FCM] notifyAdmins error:', err);
  }
}
