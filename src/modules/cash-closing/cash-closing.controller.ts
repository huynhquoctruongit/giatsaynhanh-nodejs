import type { Request, Response } from 'express';
import { asyncHandler } from '../../helpers/utils/async-handler';
import { HTTP_STATUS } from '../../helpers/constants/http';
import { cashClosingService } from './cash-closing.service';

export const cashClosingController = {
  preview: asyncHandler(async (req: Request, res: Response) => {
    const data = await cashClosingService.preview(req.query.date as string | undefined);
    res.json({ success: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await cashClosingService.create(req.body, req.user!.sub);
    res.status(HTTP_STATUS.CREATED).json({ success: true, data });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const data = await cashClosingService.list(req.query.month as string);
    res.json({ success: true, data });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await cashClosingService.remove(req.params.id);
    res.json({ success: true, data: null });
  }),
};
