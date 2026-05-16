import { z } from 'zod';

export const updateSettingsSchema = z.object({
  body: z.object({
    shopName: z.string().min(1).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    website: z.string().optional(),
    logo: z.string().optional(),
    taxCode: z.string().optional(),
    invoiceTemplate: z.string().optional(),
    invoiceShowLogo: z.boolean().optional(),
    invoiceShowPhone: z.boolean().optional(),
    invoiceShowAddress: z.boolean().optional(),
    invoiceShowWebsite: z.boolean().optional(),
    invoiceShowQR: z.boolean().optional(),
    labelTemplate: z.string().optional(),
    loyaltyEnabled: z.boolean().optional(),
    loyaltyPointsRate: z.coerce.number().nonnegative().optional(),
    deliveryEnabled: z.boolean().optional(),
    deliveryFee: z.coerce.number().nonnegative().optional(),
    allowNoShiftOrder: z.boolean().optional(),
  }),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>['body'];
