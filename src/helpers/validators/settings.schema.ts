import { z } from 'zod';

export const updateSettingsSchema = z.object({
  body: z.object({
    shopName: z.string().min(1).optional(),
    phone: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    logo: z.string().nullable().optional(),
    taxCode: z.string().nullable().optional(),
    invoiceTemplate: z.string().optional(),
    invoiceFontSize: z.coerce.number().int().min(10).max(72).optional(),
    customerNameFontSize: z.coerce.number().int().min(10).max(72).optional(),
    invoiceShowLogo: z.boolean().optional(),
    invoiceShowShopName: z.boolean().optional(),
    invoiceShowPhone: z.boolean().optional(),
    invoiceShowAddress: z.boolean().optional(),
    invoiceShowWebsite: z.boolean().optional(),
    invoiceShowBarcode: z.boolean().optional(),
    invoiceShowQR: z.boolean().optional(),
    invoiceShowDebt: z.boolean().optional(),
    openingHours: z.string().nullable().optional(),
    labelTemplate: z.string().nullable().optional(),
    labelFontSize: z.coerce.number().int().min(10).max(72).optional(),
    loyaltyEnabled: z.boolean().optional(),
    loyaltyPointsRate: z.coerce.number().nonnegative().nullable().optional(),
    deliveryEnabled: z.boolean().optional(),
    deliveryFee: z.coerce.number().nonnegative().nullable().optional(),
    bookingShippingFee: z.coerce.number().nonnegative().nullable().optional(),
    freeShipThreshold: z.coerce.number().nonnegative().nullable().optional(),
    allowNoShiftOrder: z.boolean().optional(),
  }),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>['body'];
