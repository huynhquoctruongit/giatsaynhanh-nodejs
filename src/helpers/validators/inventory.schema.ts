import { z } from 'zod';

const InventoryLogType = z.enum(['IMPORT', 'EXPORT', 'ADJUST']);

export const createInventoryItemSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    unit: z.string().min(1),
    quantity: z.coerce.number().nonnegative().default(0),
    minQuantity: z.coerce.number().nonnegative().optional(),
    importPrice: z.coerce.number().nonnegative().optional(),
    note: z.string().optional(),
    isActive: z.boolean().optional().default(true),
  }),
});

export const updateInventoryItemSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: createInventoryItemSchema.shape.body.partial(),
});

export const listInventoryItemSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    isActive: z
      .union([z.literal('true'), z.literal('false')])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const createInventoryLogSchema = z.object({
  body: z.object({
    itemId: z.string().uuid(),
    type: InventoryLogType,
    quantity: z.coerce.number().positive(),
    unitPrice: z.coerce.number().nonnegative().optional(),
    note: z.string().optional(),
  }),
});

export const listInventoryLogSchema = z.object({
  query: z.object({
    itemId: z.string().uuid().optional(),
    type: InventoryLogType.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>['body'];
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>['body'];
export type CreateInventoryLogInput = z.infer<typeof createInventoryLogSchema>['body'];
