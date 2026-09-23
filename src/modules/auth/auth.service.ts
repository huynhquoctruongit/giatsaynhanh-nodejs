import { prisma, prismaUnscoped } from '../../config/prisma';
import { getCurrentShopId } from '../../helpers/context/tenant-context';
import { hashPassword, comparePassword } from '../../helpers/utils/hash';
import { signToken } from '../../helpers/utils/jwt';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../helpers/utils/errors';
import type { LoginInput, RegisterInput } from '../../helpers/validators/auth.schema';
import { UserRole } from '../../helpers/enums';
import { toPublicUser } from '../../helpers/mappers/user.mapper';

export const authService = {
  async login(input: LoginInput) {
    // Email không còn unique toàn cục (giờ unique theo từng tiệm) nên phải
    // dùng prismaUnscoped + findMany — chưa biết shopId nên chưa có tenant context.
    const candidates = await prismaUnscoped.user.findMany({
      where: { email: input.email, ...(input.shopId ? { shopId: input.shopId } : {}) },
      include: { shop: { select: { name: true } } },
    });

    let user = candidates[0];
    if (candidates.length > 1 && !input.shopId) {
      // Email trùng ở nhiều tiệm khác nhau (hiếm) — để client hỏi lại tiệm nào.
      throw new ConflictError('Email exists in multiple shops', {
        needsShopSelection: true,
        shops: candidates.map((u) => ({ shopId: u.shopId, shopName: u.shop.name })),
      });
    }

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }
    const ok = await comparePassword(input.password, user.password);
    if (!ok) throw new UnauthorizedError('Invalid email or password');

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      shopId: user.shopId,
    });
    return { token, user: toPublicUser(user) };
  },

  async register(input: RegisterInput) {
    // findFirst (không phải findUnique): email giờ chỉ unique trong phạm vi
    // 1 tiệm (@@unique([shopId, email])); shopId được extension tự merge vào.
    const existed = await prisma.user.findFirst({ where: { email: input.email } });
    if (existed) throw new ConflictError('Email already in use');

    const password = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        shopId: getCurrentShopId(),
        email: input.email,
        password,
        name: input.name,
        role: input.role,
      },
    });
    return toPublicUser(user);
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { shop: { select: { name: true } } },
    });
    if (!user) throw new NotFoundError('User not found');
    return { ...toPublicUser(user), shopName: user.shop.name };
  },

  async updateFcmToken(userId: string, fcmToken: string) {
    await prisma.user.update({ where: { id: userId }, data: { fcmToken } });
  },
};
