import { z } from 'zod';

export const monthlyTimesheetSchema = z.object({
  query: z.object({
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month phải dạng YYYY-MM'),
    userId: z.string().uuid().optional(),
  }),
});
