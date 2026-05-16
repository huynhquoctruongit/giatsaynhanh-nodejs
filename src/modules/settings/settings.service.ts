import { prisma } from '../../config/prisma';
import type { UpdateSettingsInput } from '../../helpers/validators/settings.schema';

const DEFAULT_SETTINGS = {
  shopName: 'Laundry Shop',
  invoiceTemplate: 'default',
  invoiceShowLogo: true,
  invoiceShowPhone: true,
  invoiceShowAddress: true,
  invoiceShowWebsite: false,
  invoiceShowQR: true,
  loyaltyEnabled: false,
  deliveryEnabled: false,
  allowNoShiftOrder: true,
};

export const settingsService = {
  async get() {
    const existing = await prisma.shopSettings.findFirst();
    if (existing) return existing;

    return prisma.shopSettings.create({ data: DEFAULT_SETTINGS });
  },

  async update(input: UpdateSettingsInput) {
    const existing = await this.get();
    return prisma.shopSettings.update({
      where: { id: existing.id },
      data: input,
    });
  },
};
