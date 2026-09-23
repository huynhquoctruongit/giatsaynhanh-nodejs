import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { getCurrentShopId } from '../../helpers/context/tenant-context';

// Server chạy UTC (Render) → tính mốc ngày theo giờ VN (UTC+7) cho khớp với báo cáo.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const dayRange = (date: Date) => {
  const shifted = new Date(date.getTime() + VN_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  const start = new Date(shifted.getTime() - VN_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
};

// Payload có thể đến từ webhook GPM Pay hoặc từ REST /transactions — tên field khác nhau.
type AnyRecord = Record<string, unknown>;
const str = (v: unknown): string | null =>
  v === undefined || v === null || v === '' ? null : String(v);
const pick = (o: AnyRecord, ...keys: string[]): unknown => {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
};

export const bankService = {
  /**
   * Verify chữ ký webhook GPM Pay.
   * Định dạng chuẩn (Stripe-style): header `t=<unix>,v1=<hex>`, ký `${t}.${rawBody}`.
   * Fallback: header là hex thuần → ký trực tiếp rawBody (phòng khi GPM Pay đơn giản hơn).
   */
  verifyWebhook(rawBody: Buffer | undefined, signatureHeader: string | undefined): boolean {
    const secret = env.gpmpay.webhookSecret;
    if (!secret || !rawBody || !signatureHeader) return false;

    const parts = signatureHeader.split(',').map((s) => s.trim());
    const tPart = parts.find((p) => p.startsWith('t='))?.slice(2);
    const vPart = parts.find((p) => p.startsWith('v1='))?.slice(3);

    let signed: string;
    let provided: string;
    if (tPart && vPart) {
      // Chống replay: chỉ chấp nhận trong 300s
      const ts = Number(tPart);
      if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;
      signed = `${tPart}.${rawBody.toString('utf8')}`;
      provided = vPart;
    } else {
      signed = rawBody.toString('utf8');
      provided = signatureHeader.trim();
    }

    const expected = crypto.createHmac('sha256', secret).update(signed).digest('hex');
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(provided.replace(/^sha256=/, ''), 'hex');
    if (a.length !== b.length || a.length === 0) return false;
    return crypto.timingSafeEqual(a, b);
  },

  /**
   * Chuẩn hoá 1 giao dịch GPM Pay (webhook hoặc REST) rồi upsert theo externalId.
   * Idempotent: gửi lại cùng giao dịch không tạo bản trùng.
   */
  async ingest(raw: AnyRecord) {
    const externalId = str(pick(raw, 'id', 'referenceCode', 'transactionId'));
    if (!externalId) return null;

    const bankAccount = (raw.bankAccount as AnyRecord | undefined) ?? undefined;
    const bank = (bankAccount?.bank as AnyRecord | undefined) ?? undefined;

    const dirRaw = str(pick(raw, 'transferType', 'type', 'direction')) ?? 'IN';
    const direction = dirRaw.toUpperCase().startsWith('OUT') ? 'OUT' : 'IN';

    const amount = Number(pick(raw, 'transferAmount', 'amount') ?? 0);
    const txTime = pick(raw, 'transactionDate', 'transactionTime', 'createdAt');
    const transactionAt = txTime ? new Date(String(txTime)) : new Date();

    const data = {
      gateway: str(pick(raw, 'gateway')) ?? str(bank?.shortName) ?? str(bank?.code),
      accountNumber: str(pick(raw, 'accountNumber')) ?? str(bankAccount?.accountNumber),
      amount,
      direction,
      content: str(pick(raw, 'content', 'transferContent', 'description')),
      counterName: str(pick(raw, 'counterName')),
      counterAccount: str(pick(raw, 'counterAccount', 'subAccount')),
      referenceCode: str(pick(raw, 'referenceCode')),
      source: str(pick(raw, 'source')),
      transactionAt: isNaN(transactionAt.getTime()) ? new Date() : transactionAt,
    };

    // Webhook không có JWT → suy ra shopId qua số tài khoản nhận tiền đã cấu
    // hình sẵn lúc onboard tiệm. Không map được thì để null (chưa gán tiệm).
    const mapping = data.accountNumber
      ? await prisma.bankAccountShopMapping.findUnique({
          where: { accountNumber: data.accountNumber },
          select: { shopId: true },
        })
      : null;
    const shopId = mapping?.shopId ?? null;

    return prisma.bankTransaction.upsert({
      where: { externalId },
      create: { externalId, shopId, ...data },
      update: { shopId, ...data },
    });
  },

  /** Tổng tiền CHUYỂN VÀO (IN) trong ngày VN + danh sách giao dịch gần đây. */
  async today(date: Date = new Date()) {
    const { start, end } = dayRange(date);
    // BankTransaction không nằm trong allowlist tự động scope (webhook cần
    // ghi shopId thủ công ở trên) nên ở đây phải tự lọc theo tiệm đang đăng nhập.
    const items = await prisma.bankTransaction.findMany({
      where: { direction: 'IN', transactionAt: { gte: start, lte: end }, shopId: getCurrentShopId() },
      orderBy: { transactionAt: 'desc' },
      take: 50,
    });
    const total = items.reduce((s, t) => s + Number(t.amount), 0);
    return {
      total,
      count: items.length,
      items: items.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        content: t.content,
        counterName: t.counterName,
        gateway: t.gateway,
        transactionAt: t.transactionAt,
      })),
    };
  },

  /** Đối soát: kéo giao dịch IN gần nhất từ REST GPM Pay rồi upsert (bù webhook miss). */
  async syncFromApi(limit = 100) {
    const apiKey = env.gpmpay.apiKey;
    if (!apiKey) throw new Error('GPMPAY_API_KEY chưa cấu hình');

    const url = `${env.gpmpay.apiUrl}/transactions?type=IN&limit=${limit}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`GPM Pay REST lỗi ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as AnyRecord;
    // Cấu trúc: { statusCode, data: { data: [...], meta } }
    const outer = (json.data as AnyRecord | undefined) ?? {};
    const list = (Array.isArray(outer.data) ? outer.data : Array.isArray(json.data) ? json.data : []) as AnyRecord[];

    let upserted = 0;
    for (const item of list) {
      const r = await this.ingest(item);
      if (r) upserted++;
    }
    return { fetched: list.length, upserted };
  },
};
