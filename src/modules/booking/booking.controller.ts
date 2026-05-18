import type { Request, Response } from 'express';
import { asyncHandler } from '../../helpers/utils/async-handler';
import { HTTP_STATUS } from '../../helpers/constants/http';
import { toBookingResponse } from '../../helpers/mappers/booking.mapper';
import { bookingService } from './booking.service';
import type { BookingStatus } from '../../helpers/enums';

export const bookingController = {
  qrPrefill: asyncHandler(async (req: Request, res: Response) => {
    const data = await bookingService.getQrPrefill(req.params.token);
    res.json({ success: true, data });
  }),

  createFromQr: asyncHandler(async (req: Request, res: Response) => {
    const booking = await bookingService.createFromQr(
      req.params.token,
      req.body,
    );
    res
      .status(HTTP_STATUS.CREATED)
      .json({ success: true, data: toBookingResponse(booking) });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as {
      search?: string;
      status?: BookingStatus;
      customerId?: string;
      page: number;
      pageSize: number;
    };
    const data = await bookingService.list(q);
    res.json({
      success: true,
      data: { ...data, items: data.items.map(toBookingResponse) },
    });
  }),

  detail: asyncHandler(async (req: Request, res: Response) => {
    const booking = await bookingService.getById(req.params.id);
    res.json({ success: true, data: toBookingResponse(booking) });
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const booking = await bookingService.updateStatus(
      req.params.id,
      req.body.status,
      req.body.reason,
    );
    res.json({ success: true, data: toBookingResponse(booking) });
  }),

  convert: asyncHandler(async (req: Request, res: Response) => {
    const booking = await bookingService.convertToOrder(
      req.params.id,
      req.body,
      req.user?.sub,
    );
    res.json({ success: true, data: toBookingResponse(booking) });
  }),
};
