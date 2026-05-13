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
};
