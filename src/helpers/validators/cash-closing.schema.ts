import { z } from 'zod';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date phải dạng YYYY-MM-DD');

export const previewCashClosingSchema = z.object({
  query: z.object({ date: dateStr.optional() }),
});

export const createCashClosingSchema = z.object({
  body: z.object({
    date: dateStr.optional(),
    // Tiền mặt nhân viên đếm được trong két
    countedCash: z.number().int().min(0).max(1_000_000_000),
    expenses: z.number().int().min(0).max(10_000_000).optional(),
    expenseNote: z.string().max(200).optional(),
    note: z.string().max(500).optional(),
  }),
});

export const listCashClosingSchema = z.object({
  query: z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month phải dạng YYYY-MM') }),
});

export const cashClosingIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export type CreateCashClosingInput = z.infer<typeof createCashClosingSchema>['body'];
