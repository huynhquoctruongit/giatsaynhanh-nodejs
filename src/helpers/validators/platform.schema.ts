import { z } from 'zod';

export const platformLoginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
});

export const createShopSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang'),
    phone: z.string().optional(),
    address: z.string().optional(),
  }),
});

export const createShopAdminSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1),
  }),
  params: z.object({
    shopId: z.string().uuid(),
  }),
});

export const shopIdParamSchema = z.object({
  params: z.object({
    shopId: z.string().uuid(),
  }),
});

export const setWebhookSecretSchema = z.object({
  body: z.object({
    webhookSecret: z.string().min(1),
  }),
  params: z.object({
    shopId: z.string().uuid(),
  }),
});

export type PlatformLoginInput = z.infer<typeof platformLoginSchema>['body'];
export type CreateShopInput = z.infer<typeof createShopSchema>['body'];
export type CreateShopAdminInput = z.infer<typeof createShopAdminSchema>['body'];
export type SetWebhookSecretInput = z.infer<typeof setWebhookSecretSchema>['body'];
