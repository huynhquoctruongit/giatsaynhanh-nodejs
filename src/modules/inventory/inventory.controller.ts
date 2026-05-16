import type { Request, Response } from 'express';
import { asyncHandler } from '../../helpers/utils/async-handler';
import { inventoryService } from './inventory.service';
import { HTTP_STATUS } from '../../helpers/constants/http';

export const inventoryController = {
  // ── Items ─────────────────────────────────────────────────────────────────

  listItems: asyncHandler(async (req: Request, res: Response) => {
    const { search, isActive, page, pageSize } = req.query as unknown as {
      search?: string;
      isActive?: boolean;
      page: number;
      pageSize: number;
    };
    const data = await inventoryService.listItems({ search, isActive, page, pageSize });
    res.json({ success: true, data });
  }),

  detailItem: asyncHandler(async (req: Request, res: Response) => {
    const data = await inventoryService.getItemById(req.params.id);
    res.json({ success: true, data });
  }),

  createItem: asyncHandler(async (req: Request, res: Response) => {
    const data = await inventoryService.createItem(req.body);
    res.status(HTTP_STATUS.CREATED).json({ success: true, data });
  }),

  updateItem: asyncHandler(async (req: Request, res: Response) => {
    const data = await inventoryService.updateItem(req.params.id, req.body);
    res.json({ success: true, data });
  }),

  removeItem: asyncHandler(async (req: Request, res: Response) => {
    const data = await inventoryService.softDeleteItem(req.params.id);
    res.json({ success: true, data });
  }),

  lowStock: asyncHandler(async (_req: Request, res: Response) => {
    const data = await inventoryService.getLowStockItems();
    res.json({ success: true, data });
  }),

  // ── Logs ──────────────────────────────────────────────────────────────────

  createLog: asyncHandler(async (req: Request, res: Response) => {
    const data = await inventoryService.createLog(req.body, req.user!.sub);
    res.status(HTTP_STATUS.CREATED).json({ success: true, data });
  }),

  listLogs: asyncHandler(async (req: Request, res: Response) => {
    const { itemId, type, from, to, page, pageSize } = req.query as unknown as {
      itemId?: string;
      type?: 'IMPORT' | 'EXPORT' | 'ADJUST';
      from?: Date;
      to?: Date;
      page: number;
      pageSize: number;
    };
    const data = await inventoryService.listLogs({ itemId, type, from, to, page, pageSize });
    res.json({ success: true, data });
  }),
};
