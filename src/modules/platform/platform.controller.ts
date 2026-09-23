import type { Request, Response } from 'express';
import { asyncHandler } from '../../helpers/utils/async-handler';
import { platformService } from './platform.service';
import { HTTP_STATUS } from '../../helpers/constants/http';

export const platformController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const data = await platformService.login(req.body);
    res.json({ success: true, data });
  }),

  listShops: asyncHandler(async (_req: Request, res: Response) => {
    const data = await platformService.listShops();
    res.json({ success: true, data });
  }),

  createShop: asyncHandler(async (req: Request, res: Response) => {
    const data = await platformService.createShop(req.body);
    res.status(HTTP_STATUS.CREATED).json({ success: true, data });
  }),

  createShopAdmin: asyncHandler(async (req: Request, res: Response) => {
    const data = await platformService.createShopAdmin(req.params.shopId, req.body);
    res.status(HTTP_STATUS.CREATED).json({ success: true, data });
  }),
};
