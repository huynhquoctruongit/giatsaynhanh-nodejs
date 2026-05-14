import type { Request, Response } from 'express';
import { asyncHandler } from '../../helpers/utils/async-handler';
import { staffService } from './staff.service';
import { HTTP_STATUS } from '../../helpers/constants/http';
import { UnauthorizedError } from '../../helpers/utils/errors';
import type { ListStaffQuery } from '../../helpers/validators/staff.schema';

const requireCurrentUserId = (req: Request) => {
  if (!req.user) throw new UnauthorizedError();
  return req.user.sub;
};

export const staffController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const data = await staffService.list(req.query as unknown as ListStaffQuery);
    res.json({ success: true, data });
  }),

  detail: asyncHandler(async (req: Request, res: Response) => {
    const data = await staffService.getById(req.params.id);
    res.json({ success: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await staffService.create(req.body);
    res.status(HTTP_STATUS.CREATED).json({ success: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const currentUserId = requireCurrentUserId(req);
    const data = await staffService.update(req.params.id, req.body, currentUserId);
    res.json({ success: true, data });
  }),

  updatePermissions: asyncHandler(async (req: Request, res: Response) => {
    const currentUserId = requireCurrentUserId(req);
    const data = await staffService.updatePermissions(
      req.params.id,
      req.body,
      currentUserId,
    );
    res.json({ success: true, data });
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    await staffService.resetPassword(req.params.id, req.body);
    res.json({ success: true, data: { ok: true } });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const currentUserId = requireCurrentUserId(req);
    const result = await staffService.remove(req.params.id, currentUserId);
    res.json({ success: true, data: result });
  }),
};
