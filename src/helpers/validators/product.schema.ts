import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    unit: z.string().min(1).default('cái'),
    price: z.coerce.number().nonnegative(),
    isActive: z.coerce.boolean().optional().default(true),
    note: z.string().optional(),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: createProductSchema.shape.body.partial(),
});

export const listProductSchema = z.object({
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

export type CreateProductInput = z.infer<typeof createProductSchema>['body'];
export type UpdateProductInput = z.infer<typeof updateProductSchema>['body'];
