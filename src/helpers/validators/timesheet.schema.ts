import { z } from 'zod';

// Admin sửa giờ chấm công (vd nhân viên quên kết ca). checkOut null = vẫn đang làm.
export const updateTimeEntrySchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      checkIn: z.coerce.date(),
      checkOut: z.coerce.date().nullable(),
    })
    .refine((b) => !b.checkOut || b.checkOut > b.checkIn, {
      message: 'Giờ kết ca phải sau giờ vào ca',
      path: ['checkOut'],
    }),
});

export const timeEntryIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>['body'];

export const monthlyTimesheetSchema = z.object({
  query: z.object({
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month phải dạng YYYY-MM'),
    userId: z.string().uuid().optional(),
  }),
});
