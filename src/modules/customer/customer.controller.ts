import type { Request, Response } from 'express';
import { asyncHandler } from '../../helpers/utils/async-handler';
import { customerService } from './customer.service';
import { HTTP_STATUS } from '../../helpers/constants/http';

export const customerController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { search, sort, page, pageSize } = req.query as unknown as {
      search?: string;
      sort?: 'recent' | 'orders';
      page: number;
      pageSize: number;
    };
    const data = await customerService.list({ search, sort, page, pageSize });
    res.json({ success: true, data });
  }),

  detail: asyncHandler(async (req: Request, res: Response) => {
    const data = await customerService.getById(req.params.id);
    res.json({ success: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await customerService.create(req.body);
    res.status(HTTP_STATUS.CREATED).json({ success: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await customerService.update(req.params.id, req.body);
    res.json({ success: true, data });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await customerService.remove(req.params.id);
    res.status(HTTP_STATUS.NO_CONTENT).send();
  }),

  stats: asyncHandler(async (req: Request, res: Response) => {
    const data = await customerService.getStats(req.params.id);
    res.json({ success: true, data });
  }),

  top: asyncHandler(async (req: Request, res: Response) => {
    const { from, to, limit } = req.query as unknown as {
      from?: string;
      to?: string;
      limit?: number;
    };
    const data = await customerService.topCustomers({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json({ success: true, data });
  }),
};
