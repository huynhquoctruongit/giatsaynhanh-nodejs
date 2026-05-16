import type { Request, Response } from 'express';
import { asyncHandler } from '../../helpers/utils/async-handler';
import { supplierService } from './supplier.service';
import { HTTP_STATUS } from '../../helpers/constants/http';

export const supplierController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { search, page, pageSize, isActive } = req.query as unknown as {
      search?: string;
      page: number;
      pageSize: number;
      isActive?: boolean;
    };
    const data = await supplierService.list({ search, page, pageSize, isActive });
    res.json({ success: true, data });
  }),

  detail: asyncHandler(async (req: Request, res: Response) => {
    const data = await supplierService.getById(req.params.id);
    res.json({ success: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await supplierService.create(req.body);
    res.status(HTTP_STATUS.CREATED).json({ success: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await supplierService.update(req.params.id, req.body);
    res.json({ success: true, data });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const data = await supplierService.softDelete(req.params.id);
    res.json({ success: true, data });
  }),
};
