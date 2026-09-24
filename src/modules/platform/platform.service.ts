import crypto from 'crypto';
import { prismaUnscoped } from '../../config/prisma';
import { hashPassword, comparePassword } from '../../helpers/utils/hash';
import { signPlatformToken } from '../../helpers/utils/jwt';
import { UserRole } from '../../helpers/enums';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../helpers/utils/errors';
import type {
  PlatformLoginInput,
  CreateShopInput,
  CreateShopAdminInput,
  SetWebhookSecretInput,
} from '../../helpers/validators/platform.schema';

const genWebhookToken = () => crypto.randomBytes(24).toString('hex');

export const platformService = {
  async login(input: PlatformLoginInput) {
    const admin = await prismaUnscoped.platformAdmin.findUnique({
      where: { email: input.email },
    });
    if (!admin || !admin.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }
    const ok = await comparePassword(input.password, admin.password);
    if (!ok) throw new UnauthorizedError('Invalid email or password');

    const token = signPlatformToken({ sub: admin.id, email: admin.email, type: 'platform' });
    return { token, admin: { id: admin.id, email: admin.email, name: admin.name } };
  },

  async listShops() {
    const shops = await prismaUnscoped.shop.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true } } },
    });
    // Không bao giờ trả webhookSecret thật qua API — chỉ báo đã cấu hình hay chưa.
    return shops.map(({ webhookSecret, ...shop }) => ({
      ...shop,
      hasWebhookSecret: Boolean(webhookSecret),
    }));
  },

  async createShop(input: CreateShopInput) {
    const existed = await prismaUnscoped.shop.findUnique({ where: { slug: input.slug } });
    if (existed) throw new ConflictError('Slug already in use');
    return prismaUnscoped.shop.create({ data: { ...input, webhookToken: genWebhookToken() } });
  },

  /** Sinh mới (hoặc thay) token webhook riêng của tiệm — làm URL cũ ngừng nhận ngay. */
  async rotateWebhookToken(shopId: string) {
    const shop = await prismaUnscoped.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundError('Shop not found');
    const updated = await prismaUnscoped.shop.update({
      where: { id: shopId },
      data: { webhookToken: genWebhookToken() },
    });
    return { webhookToken: updated.webhookToken };
  },

  /** Lưu secret GPM Pay cấp riêng cho tiệm — write-only, không trả lại giá trị. */
  async setWebhookSecret(shopId: string, input: SetWebhookSecretInput) {
    const shop = await prismaUnscoped.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundError('Shop not found');
    await prismaUnscoped.shop.update({
      where: { id: shopId },
      data: { webhookSecret: input.webhookSecret },
    });
    return { hasWebhookSecret: true };
  },

  async createShopAdmin(shopId: string, input: CreateShopAdminInput) {
    const existed = await prismaUnscoped.user.findFirst({
      where: { shopId, email: input.email },
    });
    if (existed) throw new ConflictError('Email already in use in this shop');

    const password = await hashPassword(input.password);
    return prismaUnscoped.user.create({
      data: {
        shopId,
        email: input.email,
        password,
        name: input.name,
        role: UserRole.ADMIN,
      },
      select: { id: true, email: true, name: true, role: true },
    });
  },
};
