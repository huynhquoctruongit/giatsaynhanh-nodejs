import type { Request, Response } from 'express';
import { asyncHandler } from '../../helpers/utils/async-handler';
import { orderService } from './order.service';
import { HTTP_STATUS } from '../../helpers/constants/http';
import { toOrderResponse } from '../../helpers/mappers/order.mapper';
import { generateQrDataUrl, generateQrPngBuffer } from '../../helpers/utils/qr';
import { scanHistoryService } from '../qr/scan-history.service';
import type { OrderStatus } from '../../helpers/enums';

export const orderController = {
  statusCounts: asyncHandler(async (_req: Request, res: Response) => {
    const data = await orderService.statusCounts();
    res.json({ success: true, data });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as {
      search?: string;
      status?: OrderStatus;
      customerId?: string;
      fromBooking?: boolean;
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
    const isAdmin = req.user?.role === 'ADMIN';
    const order = await orderService.update(req.params.id, req.body, isAdmin);
    res.json({ success: true, data: toOrderResponse(order) });
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const isAdmin = req.user?.role === 'ADMIN';
    const order = await orderService.updateStatus(req.params.id, req.body.status, isAdmin);
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
    const isAdmin = req.user?.role === 'ADMIN';
    await orderService.remove(req.params.id, isAdmin);
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

  assign: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.assign(req.params.id, req.body.assignedToId);
    res.json({ success: true, data: toOrderResponse(order) });
  }),

  scanHistory: asyncHandler(async (req: Request, res: Response) => {
    const data = await scanHistoryService.listByOrder(req.params.id);
    res.json({ success: true, data });
  }),
};
