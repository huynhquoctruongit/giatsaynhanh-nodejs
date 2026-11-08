import type { Request, Response } from 'express';
import { asyncHandler } from '../../helpers/utils/async-handler';
import { authService } from './auth.service';
import { HTTP_STATUS } from '../../helpers/constants/http';
import { UnauthorizedError } from '../../helpers/utils/errors';

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const data = await authService.login(req.body);
    res.json({ success: true, data });
  }),

  register: asyncHandler(async (req: Request, res: Response) => {
    const data = await authService.register(req.body);
    res.status(HTTP_STATUS.CREATED).json({ success: true, data });
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const data = await authService.me(req.user.sub);
    res.json({ success: true, data });
  }),

  linkedShops: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const data = await authService.listLinkedShops(req.user.sub);
    res.json({ success: true, data });
  }),

  linkShop: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const data = await authService.linkShop(req.user.sub, req.body);
    res.json({ success: true, data });
  }),

  unlinkShop: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const data = await authService.unlinkShop(req.user.sub, req.params.shopId);
    res.json({ success: true, data });
  }),

  switchShop: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const data = await authService.switchShop(req.user.sub, req.body.shopId);
    res.json({ success: true, data });
  }),

  clearFcmToken: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    await authService.clearFcmToken(req.user.sub);
    res.json({ success: true });
  }),

  updateFcmToken: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      res.status(400).json({ success: false, message: 'token is required' });
      return;
    }
    await authService.updateFcmToken(req.user.sub, token);
    res.json({ success: true });
  }),
};
