import type { Request, Response } from 'express';
import { asyncHandler } from '../../helpers/utils/async-handler';
import { orderService } from '../order/order.service';
import {
  toOrderResponse,
  toPublicOrderResponse,
} from '../../helpers/mappers/order.mapper';
import { scanHistoryService } from './scan-history.service';

export const qrController = {
  verifyPublic: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.getByToken(req.params.token);

    if (req.user) {
      await scanHistoryService.log({
        orderId: order.id,
        userId: req.user.sub,
        action: 'VIEW',
        ip: req.ip,
        userAgent: req.header('user-agent') ?? undefined,
      });
      res.json({ success: true, data: toOrderResponse(order) });
      return;
    }

    await scanHistoryService.log({
      orderId: order.id,
      action: 'VIEW',
      ip: req.ip,
      userAgent: req.header('user-agent') ?? undefined,
      meta: { anonymous: true },
    });
    res.json({ success: true, data: toPublicOrderResponse(order) });
  }),

  scanStaff: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.getByToken(req.params.token);
    await scanHistoryService.log({
      orderId: order.id,
      userId: req.user?.sub,
      action: 'VIEW',
      ip: req.ip,
      userAgent: req.header('user-agent') ?? undefined,
      meta: { staffScan: true },
    });
    res.json({ success: true, data: toOrderResponse(order) });
  }),
};
