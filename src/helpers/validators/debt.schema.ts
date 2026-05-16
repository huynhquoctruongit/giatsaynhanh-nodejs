import { z } from 'zod';

const DebtType = z.enum(['MONEY', 'GOODS']);

const debtBodySchema = z.object({
  amount: z.coerce.number().positive(),
  type: DebtType.default('MONEY'),
  description: z.string().optional(),
  dueDate: z.coerce.date().optional(),
});

export const createCustomerDebtSchema = z.object({
  body: debtBodySchema.extend({
    customerId: z.string().uuid(),
  }),
});

export const updateCustomerDebtSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: debtBodySchema.partial(),
});

export const createSupplierDebtSchema = z.object({
  body: debtBodySchema.extend({
    supplierId: z.string().uuid(),
  }),
});

export const updateSupplierDebtSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: debtBodySchema.partial(),
});

export const payDebtSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    paidAmount: z.coerce.number().positive(),
  }),
});

export const listCustomerDebtSchema = z.object({
  query: z.object({
    customerId: z.string().uuid().optional(),
    isPaid: z
      .union([z.literal('true'), z.literal('false')])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const listSupplierDebtSchema = z.object({
  query: z.object({
    supplierId: z.string().uuid().optional(),
    isPaid: z
      .union([z.literal('true'), z.literal('false')])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export type CreateCustomerDebtInput = z.infer<typeof createCustomerDebtSchema>['body'];
export type UpdateCustomerDebtInput = z.infer<typeof updateCustomerDebtSchema>['body'];
export type CreateSupplierDebtInput = z.infer<typeof createSupplierDebtSchema>['body'];
export type UpdateSupplierDebtInput = z.infer<typeof updateSupplierDebtSchema>['body'];
export type PayDebtInput = z.infer<typeof payDebtSchema>['body'];
