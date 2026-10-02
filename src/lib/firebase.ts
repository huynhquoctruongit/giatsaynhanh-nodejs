import * as admin from 'firebase-admin';
import type { DB } from '../config/prisma';

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

/** Gửi push notification đến nhiều thiết bị (fire-and-forget, không throw) */
export async function sendPush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  if (!tokens.length) return;
  initFirebase();
  if (!initialized) return;

  try {
    const result = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data,
      android: {
        priority: 'high',
      },
    });
    console.log(`[FCM] Sent ${result.successCount}/${tokens.length} — fail: ${result.failureCount}`);
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
