import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    // Chỉ cần khi email trùng ở nhiều tiệm (hiếm) — client gửi lại sau khi
    // nhận 409 {needsShopSelection, shops} ở lần login đầu.
    shopId: z.string().uuid().optional(),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1),
    role: z.enum(['ADMIN', 'STAFF']).default('STAFF'),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
export type RegisterInput = z.infer<typeof registerSchema>['body'];
