import { z } from 'zod';

/**
 * Quyền nhân viên — FE (app + web) gửi MẢNG các key đang bật, vd:
 *   ['ORDER_CREATE', 'ORDER_UPDATE']
 * Chấp nhận thêm dạng object {KEY: true} để tương thích về sau.
 * Backend chuẩn hoá về map {KEY: true} khi lưu (xem normalizePermissionInput).
 */
const permissionsInputSchema = z.union([
  z.array(z.string()),
  z.record(z.boolean()),
]);

/**
 * Giới hạn thời gian xem đơn: số phút (number) hoặc chuỗi; trống/null = không giới hạn.
 * (FE đang nhập theo PHÚT nên không ràng buộc enum ngày/tuần/tháng nữa.)
 */
const orderViewTimeLimitSchema = z
  .union([z.number().int().nonnegative(), z.string(), z.null()])
  .optional();

export const listStaffSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    role: z.enum(['ADMIN', 'STAFF']).optional(),
    isActive: z
      .string()
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
  }),
});

export const createStaffSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1),
    phone: z.string().optional(),
    role: z.enum(['ADMIN', 'STAFF']).default('STAFF'),
    permissions: permissionsInputSchema.optional(),
    orderViewTimeLimit: orderViewTimeLimitSchema,
  }),
});

export const updateStaffSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    phone: z.string().optional().nullable(),
    role: z.enum(['ADMIN', 'STAFF']).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateStaffPermissionsSchema = z.object({
  body: z.object({
    permissions: permissionsInputSchema,
    orderViewTimeLimit: orderViewTimeLimitSchema,
  }),
});

export const updateStaffPasswordSchema = z.object({
  body: z.object({
    password: z.string().min(6),
  }),
});

export type ListStaffQuery = z.infer<typeof listStaffSchema>['query'];
export type CreateStaffInput = z.infer<typeof createStaffSchema>['body'];
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>['body'];
export type UpdateStaffPermissionsInput = z.infer<
  typeof updateStaffPermissionsSchema
>['body'];
export type UpdateStaffPasswordInput = z.infer<
  typeof updateStaffPasswordSchema
>['body'];
