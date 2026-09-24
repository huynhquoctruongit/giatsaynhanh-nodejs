import type { Request, Response } from 'express';
import { asyncHandler } from '../../helpers/utils/async-handler';
import { env } from '../../config/env';
import { prismaUnscoped } from '../../config/prisma';
import { bankService } from './bank.service';

export const bankController = {
  /**
   * Webhook GPM Pay (PUBLIC — không qua authStaff). Verify HMAC bằng rawBody.
   * Trả 200 nhanh để GPM Pay không retry; sai chữ ký → 401.
   */
  webhook: asyncHandler(async (req: Request, res: Response) => {
    if (!env.gpmpay.webhookSecret) {
      res.status(503).json({ success: false, error: 'Webhook secret chưa cấu hình' });
      return;
    }
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    const signature =
      req.header('X-GPMPay-Signature') ??
      req.header('x-gpmpay-signature') ??
      req.header('X-Signature') ??
      undefined;

    if (!bankService.verifyWebhook(rawBody, signature)) {
      // Log để đối chiếu định dạng chữ ký thật lần đầu tích hợp
      console.warn('[gpmpay] webhook chữ ký không hợp lệ', { signature });
      res.status(401).json({ success: false, error: 'Invalid signature' });
      return;
    }

    // Payload có thể là 1 giao dịch, hoặc bọc trong { data } / mảng
    const body = req.body as Record<string, unknown>;
    const payload = (body?.data as Record<string, unknown>) ?? body;
    const list = Array.isArray(payload) ? payload : [payload];
    for (const item of list) {
      await bankService.ingest(item as Record<string, unknown>);
    }

    res.json({ success: true, data: { received: true } });
  }),

  /**
   * Webhook GPM Pay riêng cho 1 tiệm (Phase 8) — tiệm tự đăng ký tài khoản
   * GPM Pay riêng, có secret riêng. `token` tra thẳng ra shopId, verify bằng
   * đúng secret của tiệm đó. Song song route `webhook` cũ, không thay thế.
   */
  webhookByToken: asyncHandler(async (req: Request, res: Response) => {
    const shop = await prismaUnscoped.shop.findUnique({
      where: { webhookToken: req.params.token },
      select: { id: true, isActive: true, webhookSecret: true },
    });
    if (!shop || !shop.isActive) {
      res.status(404).json({ success: false, error: 'Not found' });
      return;
    }
    if (!shop.webhookSecret) {
      res.status(503).json({ success: false, error: 'Webhook secret chưa cấu hình' });
      return;
    }

    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    const signature =
      req.header('X-GPMPay-Signature') ??
      req.header('x-gpmpay-signature') ??
      req.header('X-Signature') ??
      undefined;

    if (!bankService.verifyWebhook(rawBody, signature, shop.webhookSecret)) {
      console.warn('[gpmpay] webhook (per-shop) chữ ký không hợp lệ', { shopId: shop.id, signature });
      res.status(401).json({ success: false, error: 'Invalid signature' });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const payload = (body?.data as Record<string, unknown>) ?? body;
    const list = Array.isArray(payload) ? payload : [payload];
    for (const item of list) {
      await bankService.ingest(item as Record<string, unknown>, shop.id);
    }

    res.json({ success: true, data: { received: true } });
  }),

  /** GPM Pay ping GET để kiểm tra URL riêng của tiệm sống trước khi lưu webhook. */
  pingByToken: asyncHandler(async (req: Request, res: Response) => {
    const shop = await prismaUnscoped.shop.findUnique({
      where: { webhookToken: req.params.token },
      select: { isActive: true },
    });
    if (!shop || !shop.isActive) {
      res.status(404).json({ success: false, error: 'Not found' });
      return;
    }
    res.status(200).json({ ok: true });
  }),

  /** Tổng + danh sách chuyển khoản hôm nay (staff). */
  getToday: asyncHandler(async (req: Request, res: Response) => {
    const { date } = req.query as { date?: string };
    const data = await bankService.today(date ? new Date(date) : new Date());
    res.json({ success: true, data });
  }),

  /** Đối soát thủ công từ REST GPM Pay (staff). */
  sync: asyncHandler(async (_req: Request, res: Response) => {
    const data = await bankService.syncFromApi();
    res.json({ success: true, data });
  }),
};
