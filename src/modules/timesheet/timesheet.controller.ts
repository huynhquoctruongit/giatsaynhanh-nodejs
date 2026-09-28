import type { Request, Response } from 'express';
import { asyncHandler } from '../../helpers/utils/async-handler';
import { UserRole } from '../../helpers/enums';
import { timesheetService } from './timesheet.service';

export const timesheetController = {
  current: asyncHandler(async (req: Request, res: Response) => {
    const data = await timesheetService.getCurrent(req.user!.sub);
    res.json({ success: true, data });
  }),

  checkIn: asyncHandler(async (req: Request, res: Response) => {
    const data = await timesheetService.checkIn(req.user!.sub);
    res.json({ success: true, data });
  }),

  checkOut: asyncHandler(async (req: Request, res: Response) => {
    const data = await timesheetService.checkOut(req.user!.sub);
    res.json({ success: true, data });
  }),

  monthly: asyncHandler(async (req: Request, res: Response) => {
    const { month, userId } = req.query as { month: string; userId?: string };
    // Nhân viên chỉ xem được của chính mình; ADMIN xem tất cả hoặc lọc theo userId.
    const scopedUserId = req.user!.role === UserRole.ADMIN ? userId : req.user!.sub;
    const data = await timesheetService.monthly(month, scopedUserId);
    res.json({ success: true, data });
  }),
};
