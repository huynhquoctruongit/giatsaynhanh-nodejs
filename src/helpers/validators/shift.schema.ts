import { z } from 'zod';

export const createShiftSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    note: z.string().optional(),
  }),
});

export const closeShiftSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    note: z.string().optional(),
  }),
});

export const addAttendanceSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    userId: z.string().uuid(),
    checkIn: z.coerce.date().optional().default(() => new Date()),
    note: z.string().optional(),
  }),
});

export const checkOutSchema = z.object({
  params: z.object({ id: z.string().uuid(), attendanceId: z.string().uuid() }),
  body: z.object({
    checkOut: z.coerce.date().optional().default(() => new Date()),
  }),
});

export const listShiftSchema = z.object({
  query: z.object({
    isOpen: z
      .union([z.literal('true'), z.literal('false')])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export type CreateShiftInput = z.infer<typeof createShiftSchema>['body'];
export type CloseShiftInput = z.infer<typeof closeShiftSchema>['body'];
export type AddAttendanceInput = z.infer<typeof addAttendanceSchema>['body'];
export type CheckOutInput = z.infer<typeof checkOutSchema>['body'];
