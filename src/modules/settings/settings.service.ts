import { prisma, prismaUnscoped } from '../../config/prisma';
import { getCurrentShopId } from '../../helpers/context/tenant-context';
import { NotFoundError } from '../../helpers/utils/errors';
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
  // ShopSettings không nằm trong allowlist tự động scope (mỗi tiệm 1 row,
  // định danh bằng shopId @unique thay vì id) nên tự lọc/gán shopId thủ công ở đây.
  async get() {
    const shopId = getCurrentShopId();
    const existing = await prisma.shopSettings.findUnique({ where: { shopId } });
    if (existing) return existing;

    return prisma.shopSettings.create({ data: { ...DEFAULT_SETTINGS, shopId } });
  },

  /**
   * Thông tin tiệm công khai (landing/booking) theo slug — KHÔNG cần đăng nhập,
   * KHÔNG có tenant context (route không có JWT) nên tra bằng prismaUnscoped.
   */
  async getPublicBySlug(shopSlug: string) {
    const shop = await prismaUnscoped.shop.findUnique({
      where: { slug: shopSlug, isActive: true },
    });
    if (!shop) throw new NotFoundError('Shop not found');

    const s = await prismaUnscoped.shopSettings.findUnique({ where: { shopId: shop.id } });
    return {
      shopId: shop.id,
      shopSlug: shop.slug,
      shopName: s?.shopName ?? shop.name,
      phone: s?.phone ?? shop.phone,
      address: s?.address ?? shop.address,
      website: s?.website,
      openingHours: s?.openingHours,
    };
  },

  async update(input: UpdateSettingsInput) {
    const existing = await this.get();
    return prisma.shopSettings.update({
      where: { id: existing.id },
      data: input,
    });
  },
};
