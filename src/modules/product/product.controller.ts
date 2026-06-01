import type { Request, Response } from 'express';
import { asyncHandler } from '../../helpers/utils/async-handler';
import { productService } from './product.service';
import { HTTP_STATUS } from '../../helpers/constants/http';

const toResponse = (p: {
  id: string;
  name: string;
  unit: string;
  price: unknown;
  importPrice?: unknown;
  costPrice?: unknown;
  wholesaleEnabled?: boolean;
  wholesaleTiers?: unknown;
  isActive: boolean;
  hiddenFromBooking?: boolean;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  ...p,
  price: Number(p.price),
  importPrice: p.importPrice != null ? Number(p.importPrice) : null,
  costPrice: p.costPrice != null ? Number(p.costPrice) : null,
  wholesaleEnabled: p.wholesaleEnabled ?? false,
  wholesaleTiers: (p.wholesaleTiers as unknown[] | null) ?? null,
  hiddenFromBooking: p.hiddenFromBooking ?? false,
});

export const productController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as {
      search?: string;
      isActive?: boolean;
      page: number;
      pageSize: number;
    };
    const data = await productService.list(q);
    res.json({
      success: true,
      data: { ...data, items: data.items.map(toResponse) },
    });
  }),

  detail: asyncHandler(async (req: Request, res: Response) => {
    const data = await productService.getById(req.params.id);
    res.json({ success: true, data: toResponse(data) });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await productService.create(req.body);
    res.status(HTTP_STATUS.CREATED).json({ success: true, data: toResponse(data) });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await productService.update(req.params.id, req.body);
    res.json({ success: true, data: toResponse(data) });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await productService.remove(req.params.id);
    res.status(HTTP_STATUS.NO_CONTENT).send();
  }),
};
