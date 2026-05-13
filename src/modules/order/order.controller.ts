import type { Request, Response } from 'express';
import { asyncHandler } from '../../helpers/utils/async-handler';
import { orderService } from './order.service';
import { HTTP_STATUS } from '../../helpers/constants/http';
import { toOrderResponse } from '../../helpers/mappers/order.mapper';
import { generateQrDataUrl, generateQrPngBuffer } from '../../helpers/utils/qr';
import { scanHistoryService } from '../qr/scan-history.service';
import type { OrderStatus } from '../../helpers/enums';

export const orderController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as {
      search?: string;
      status?: OrderStatus;
      customerId?: string;
      page: number;
      pageSize: number;
    };
    const data = await orderService.list(q);
    res.json({
      success: true,
      data: { ...data, items: data.items.map(toOrderResponse) },
    });
  }),

  detail: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.getById(req.params.id);
    res.json({ success: true, data: toOrderResponse(order) });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.create(req.body, req.user?.sub);
    res.status(HTTP_STATUS.CREATED).json({ success: true, data: toOrderResponse(order) });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.update(req.params.id, req.body);
    res.json({ success: true, data: toOrderResponse(order) });
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.updateStatus(req.params.id, req.body.status);
    await scanHistoryService.log({
      orderId: order.id,
      userId: req.user?.sub,
      action: 'UPDATE_STATUS',
      ip: req.ip,
      userAgent: req.header('user-agent') ?? undefined,
      meta: { newStatus: order.status },
    });
    res.json({ success: true, data: toOrderResponse(order) });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await orderService.remove(req.params.id);
    res.status(HTTP_STATUS.NO_CONTENT).send();
  }),

  qrDataUrl: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.getById(req.params.id);
    const dataUrl = await generateQrDataUrl(order.qrToken);
    res.json({
      success: true,
      data: { token: order.qrToken, dataUrl, code: order.code },
    });
  }),

  qrPng: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.getById(req.params.id);
    const buffer = await generateQrPngBuffer(order.qrToken);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="qr-${order.code}.png"`,
    );
    res.send(buffer);
  }),

  scanHistory: asyncHandler(async (req: Request, res: Response) => {
    const data = await scanHistoryService.listByOrder(req.params.id);
    res.json({ success: true, data });
  }),
};
