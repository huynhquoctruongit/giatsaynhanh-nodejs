import type { Request, Response } from 'express';
import { asyncHandler } from '../../helpers/utils/async-handler';
import { financeService } from './finance.service';
import { HTTP_STATUS } from '../../helpers/constants/http';

export const financeController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { type, from, to, page, pageSize } = req.query as unknown as {
      type?: 'INCOME' | 'EXPENSE';
      from?: Date;
      to?: Date;
      page: number;
      pageSize: number;
    };
    const data = await financeService.list({ type, from, to, page, pageSize });
    res.json({ success: true, data });
  }),

  detail: asyncHandler(async (req: Request, res: Response) => {
    const data = await financeService.getById(req.params.id);
    res.json({ success: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await financeService.create(req.body, req.user!.sub);
    res.status(HTTP_STATUS.CREATED).json({ success: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await financeService.update(req.params.id, req.body);
    res.json({ success: true, data });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await financeService.remove(req.params.id);
    res.status(HTTP_STATUS.NO_CONTENT).send();
  }),

  summary: asyncHandler(async (req: Request, res: Response) => {
    // Dates are coerced by the validate middleware via summaryTransactionSchema
    const { from, to } = req.query as unknown as { from?: Date; to?: Date };
    const data = await financeService.summary({ from, to });
    res.json({ success: true, data });
  }),
};
