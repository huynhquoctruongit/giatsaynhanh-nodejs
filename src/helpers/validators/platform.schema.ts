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

export const activateSubscriptionSchema = z.object({
  body: z.object({
    plan: z.enum(['TRIAL', 'SIX_MONTHS', 'ONE_YEAR', 'THREE_YEARS', 'LIFETIME']),
  }),
  params: z.object({
    shopId: z.string().uuid(),
  }),
});

export const updatePlanConfigSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    period: z.string().trim().min(1).max(50),
    description: z.string().trim().max(300),
    price: z.number().int().min(0),
    features: z.array(z.string().trim().min(1).max(200)).max(20),
    popular: z.boolean(),
  }),
  params: z.object({
    plan: z.enum(['SIX_MONTHS', 'ONE_YEAR', 'THREE_YEARS', 'LIFETIME']),
  }),
});

export const planParamSchema = z.object({
  params: z.object({
    plan: z.enum(['SIX_MONTHS', 'ONE_YEAR', 'THREE_YEARS', 'LIFETIME']),
  }),
});

export type PlatformLoginInput = z.infer<typeof platformLoginSchema>['body'];
export type CreateShopInput = z.infer<typeof createShopSchema>['body'];
export type CreateShopAdminInput = z.infer<typeof createShopAdminSchema>['body'];
export type SetWebhookSecretInput = z.infer<typeof setWebhookSecretSchema>['body'];
export type UpdatePlanConfigInput = z.infer<typeof updatePlanConfigSchema>['body'];
export type ActivateSubscriptionInput = z.infer<typeof activateSubscriptionSchema>['body'];
