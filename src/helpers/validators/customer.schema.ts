import { z } from 'zod';

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    phone: z
      .string()
      .min(8)
      .max(20)
      .regex(/^[0-9+()\-\s]+$/, 'Invalid phone'),
    address: z.string().optional(),
    note: z.string().optional(),
  }),
});

export const updateCustomerSchema = z.object({
  body: createCustomerSchema.shape.body.partial(),
  params: z.object({ id: z.string().uuid() }),
});

export const listCustomerSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>['body'];
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>['body'];
