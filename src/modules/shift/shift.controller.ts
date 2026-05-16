import type { Request, Response } from 'express';
import { asyncHandler } from '../../helpers/utils/async-handler';
import { shiftService } from './shift.service';
import { HTTP_STATUS } from '../../helpers/constants/http';

export const shiftController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { isOpen, from, to, page, pageSize } = req.query as unknown as {
      isOpen?: boolean;
      from?: Date;
      to?: Date;
      page: number;
      pageSize: number;
    };
    const data = await shiftService.list({ isOpen, from, to, page, pageSize });
    res.json({ success: true, data });
  }),

  current: asyncHandler(async (_req: Request, res: Response) => {
    const data = await shiftService.getCurrent();
    res.json({ success: true, data });
  }),

  detail: asyncHandler(async (req: Request, res: Response) => {
    const data = await shiftService.getById(req.params.id);
    res.json({ success: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await shiftService.create(req.body, req.user!.sub);
    res.status(HTTP_STATUS.CREATED).json({ success: true, data });
  }),

  close: asyncHandler(async (req: Request, res: Response) => {
    const data = await shiftService.close(req.params.id, req.body);
    res.json({ success: true, data });
  }),

  addAttendance: asyncHandler(async (req: Request, res: Response) => {
    const data = await shiftService.addAttendance(req.params.id, req.body);
    res.status(HTTP_STATUS.CREATED).json({ success: true, data });
  }),

  checkout: asyncHandler(async (req: Request, res: Response) => {
    const data = await shiftService.checkout(req.params.id, req.params.attendanceId, req.body);
    res.json({ success: true, data });
  }),
};
