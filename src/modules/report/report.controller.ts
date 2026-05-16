import type { Request, Response } from 'express';
import { asyncHandler } from '../../helpers/utils/async-handler';
import { reportService } from './report.service';

const parseDate = (val: unknown): Date | undefined => {
  if (!val || typeof val !== 'string') return undefined;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
};

export const reportController = {
  dashboard: asyncHandler(async (req: Request, res: Response) => {
    const { date } = req.query as { date?: string };
    const data = await reportService.dashboard(date ? new Date(date) : new Date());
    res.json({ success: true, data });
  }),

  financial: asyncHandler(async (req: Request, res: Response) => {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const data = await reportService.financial({ from, to });
    res.json({ success: true, data });
  }),

  sales: asyncHandler(async (req: Request, res: Response) => {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const data = await reportService.sales({ from, to });
    res.json({ success: true, data });
  }),

  inventory: asyncHandler(async (_req: Request, res: Response) => {
    const data = await reportService.inventory();
    res.json({ success: true, data });
  }),
};
