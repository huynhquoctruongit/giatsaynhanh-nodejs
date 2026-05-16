import { z } from 'zod';

const TransactionType = z.enum(['INCOME', 'EXPENSE']);

export const createTransactionSchema = z.object({
  body: z.object({
    type: TransactionType,
    category: z.string().min(1),
    amount: z.coerce.number().positive(),
    description: z.string().optional(),
    date: z.coerce.date().optional().default(() => new Date()),
    referenceId: z.string().optional(),
  }),
});

export const updateTransactionSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: createTransactionSchema.shape.body.partial(),
});

export const listTransactionSchema = z.object({
  query: z.object({
    type: TransactionType.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const summaryTransactionSchema = z.object({
  query: z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>['body'];
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>['body'];
