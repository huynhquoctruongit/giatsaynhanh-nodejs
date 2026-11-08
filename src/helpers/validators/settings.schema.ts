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
    invoiceNote: z.string().nullable().optional(),
    smallOrderNote: z.string().nullable().optional(),
    invoiceSubtitle: z.string().max(100).nullable().optional(),
    promoEnabled: z.boolean().optional(),
    promoType: z.enum(['PERCENT', 'AMOUNT']).optional(),
    promoValue: z.coerce.number().min(0).max(100_000_000).optional(),
    promoStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày dạng YYYY-MM-DD').nullable().optional(),
    promoEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày dạng YYYY-MM-DD').nullable().optional(),
    promoLabel: z.string().max(50).nullable().optional(),
    bankBin: z.string().nullable().optional(),
    bankAccountNumber: z.string().nullable().optional(),
    bankAccountName: z.string().nullable().optional(),
    labelTemplate: z.string().nullable().optional(),
    labelFontSize: z.coerce.number().int().min(10).max(72).optional(),
    loyaltyEnabled: z.boolean().optional(),
    loyaltyPointsRate: z.coerce.number().nonnegative().nullable().optional(),
    deliveryEnabled: z.boolean().optional(),
    deliveryFee: z.coerce.number().nonnegative().nullable().optional(),
    bookingShippingFee: z.coerce.number().nonnegative().nullable().optional(),
    freeShipThreshold: z.coerce.number().nonnegative().nullable().optional(),
    allowNoShiftOrder: z.boolean().optional(),
    bookingQrEnabled: z.boolean().optional(),
    openingCash: z.number().min(0).max(100_000_000).optional(),
    defaultExpenses: z.number().min(0).max(10_000_000).optional(),
    closeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ đóng cửa dạng HH:mm').optional(),
  })
    .refine((b) => !(b.promoType === 'PERCENT' && (b.promoValue ?? 0) > 100), {
      message: 'Giảm theo % tối đa 100',
      path: ['promoValue'],
    })
    .refine((b) => !(b.promoStartDate && b.promoEndDate && b.promoStartDate > b.promoEndDate), {
      message: 'Ngày kết thúc phải sau ngày bắt đầu',
      path: ['promoEndDate'],
    }),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>['body'];
