import { z } from 'zod';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date phải dạng YYYY-MM-DD');

export const listAuditSchema = z.object({ query: z.object({ date: dateStr.optional() }) });

export const markAuditSchema = z.object({
  body: z.object({
    orderId: z.string().uuid(),
    result: z.enum(['VERIFIED', 'ANOMALY']).default('VERIFIED'),
  }),
});

export const auditSummarySchema = z.object({
  query: z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month phải dạng YYYY-MM') }),
});
