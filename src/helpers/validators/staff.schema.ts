import { z } from 'zod';
import {
  ALL_ORDER_VIEW_TIME_LIMITS,
  ALL_PERMISSION_KEYS,
} from '../enums/permissions';

const permissionMapSchema = z
  .record(z.boolean())
  .superRefine((value, ctx) => {
    for (const key of Object.keys(value)) {
      if (!ALL_PERMISSION_KEYS.includes(key as (typeof ALL_PERMISSION_KEYS)[number])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown permission key: ${key}`,
          path: [key],
        });
      }
    }
  });

const orderViewTimeLimitSchema = z.enum(
  ALL_ORDER_VIEW_TIME_LIMITS as [string, ...string[]],
);

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
    permissions: permissionMapSchema.optional(),
    orderViewTimeLimit: orderViewTimeLimitSchema.optional(),
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
    permissions: permissionMapSchema,
    orderViewTimeLimit: orderViewTimeLimitSchema.optional(),
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
