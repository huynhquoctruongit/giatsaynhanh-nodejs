import { z } from 'zod';

export const createSupplierSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    address: z.string().optional(),
    email: z.string().email().optional(),
    note: z.string().optional(),
    isActive: z.boolean().optional().default(true),
  }),
});

export const updateSupplierSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: createSupplierSchema.shape.body.partial(),
});

export const listSupplierSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    isActive: z
      .union([z.literal('true'), z.literal('false')])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(500).default(20),
  }),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>['body'];
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>['body'];
