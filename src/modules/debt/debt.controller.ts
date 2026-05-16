import type { Request, Response } from 'express';
import { asyncHandler } from '../../helpers/utils/async-handler';
import { debtService } from './debt.service';
import { HTTP_STATUS } from '../../helpers/constants/http';

export const debtController = {
  // ── Customer debts ───────────────────────────────────────────────────────────

  listCustomer: asyncHandler(async (req: Request, res: Response) => {
    const { customerId, isPaid, page, pageSize } = req.query as unknown as {
      customerId?: string;
      isPaid?: boolean;
      page: number;
      pageSize: number;
    };
    const data = await debtService.listCustomerDebts({ customerId, isPaid, page, pageSize });
    res.json({ success: true, data });
  }),

  detailCustomer: asyncHandler(async (req: Request, res: Response) => {
    const data = await debtService.getCustomerDebtById(req.params.id);
    res.json({ success: true, data });
  }),

  createCustomer: asyncHandler(async (req: Request, res: Response) => {
    const data = await debtService.createCustomerDebt(req.body);
    res.status(HTTP_STATUS.CREATED).json({ success: true, data });
  }),

  updateCustomer: asyncHandler(async (req: Request, res: Response) => {
    const data = await debtService.updateCustomerDebt(req.params.id, req.body);
    res.json({ success: true, data });
  }),

  removeCustomer: asyncHandler(async (req: Request, res: Response) => {
    await debtService.removeCustomerDebt(req.params.id);
    res.status(HTTP_STATUS.NO_CONTENT).send();
  }),

  payCustomer: asyncHandler(async (req: Request, res: Response) => {
    const data = await debtService.payCustomerDebt(req.params.id, req.body);
    res.json({ success: true, data });
  }),

  // ── Supplier debts ───────────────────────────────────────────────────────────

  listSupplier: asyncHandler(async (req: Request, res: Response) => {
    const { supplierId, isPaid, page, pageSize } = req.query as unknown as {
      supplierId?: string;
      isPaid?: boolean;
      page: number;
      pageSize: number;
    };
    const data = await debtService.listSupplierDebts({ supplierId, isPaid, page, pageSize });
    res.json({ success: true, data });
  }),

  detailSupplier: asyncHandler(async (req: Request, res: Response) => {
    const data = await debtService.getSupplierDebtById(req.params.id);
    res.json({ success: true, data });
  }),

  createSupplier: asyncHandler(async (req: Request, res: Response) => {
    const data = await debtService.createSupplierDebt(req.body);
    res.status(HTTP_STATUS.CREATED).json({ success: true, data });
  }),

  updateSupplier: asyncHandler(async (req: Request, res: Response) => {
    const data = await debtService.updateSupplierDebt(req.params.id, req.body);
    res.json({ success: true, data });
  }),

  removeSupplier: asyncHandler(async (req: Request, res: Response) => {
    await debtService.removeSupplierDebt(req.params.id);
    res.status(HTTP_STATUS.NO_CONTENT).send();
  }),

  paySupplier: asyncHandler(async (req: Request, res: Response) => {
    const data = await debtService.paySupplierDebt(req.params.id, req.body);
    res.json({ success: true, data });
  }),

  // ── Summary ──────────────────────────────────────────────────────────────────

  summary: asyncHandler(async (_req: Request, res: Response) => {
    const data = await debtService.summary();
    res.json({ success: true, data });
  }),
};
