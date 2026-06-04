import type { Request, Response } from 'express';
import { asyncHandler } from '../../helpers/utils/async-handler';
import { settingsService } from './settings.service';

export const settingsController = {
  get: asyncHandler(async (_req: Request, res: Response) => {
    const data = await settingsService.get();
    res.json({ success: true, data });
  }),

  getPublic: asyncHandler(async (_req: Request, res: Response) => {
    const data = await settingsService.getPublic();
    res.json({ success: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await settingsService.update(req.body);
    res.json({ success: true, data });
  }),
};
