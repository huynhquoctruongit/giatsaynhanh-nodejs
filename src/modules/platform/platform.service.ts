import { prismaUnscoped } from '../../config/prisma';
import { hashPassword, comparePassword } from '../../helpers/utils/hash';
import { signPlatformToken } from '../../helpers/utils/jwt';
import { UserRole } from '../../helpers/enums';
import { ConflictError, UnauthorizedError } from '../../helpers/utils/errors';
import type {
  PlatformLoginInput,
  CreateShopInput,
  CreateShopAdminInput,
} from '../../helpers/validators/platform.schema';

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
    return prismaUnscoped.shop.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true } } },
    });
  },

  async createShop(input: CreateShopInput) {
    const existed = await prismaUnscoped.shop.findUnique({ where: { slug: input.slug } });
    if (existed) throw new ConflictError('Slug already in use');
    return prismaUnscoped.shop.create({ data: input });
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
