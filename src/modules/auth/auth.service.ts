import { randomUUID } from 'node:crypto';
import { prisma, prismaUnscoped } from '../../config/prisma';
import { getCurrentShopId } from '../../helpers/context/tenant-context';
import { hashPassword, comparePassword } from '../../helpers/utils/hash';
import { signToken } from '../../helpers/utils/jwt';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../helpers/utils/errors';
import type {
  LinkShopInput,
  LoginInput,
  RegisterInput,
} from '../../helpers/validators/auth.schema';
import { UserRole } from '../../helpers/enums';
import { clearShopBadgeCache, removeFromPosLists } from '../../lib/firebase';
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

  // ===== Đổi tiệm (chủ quản lý nhiều tiệm) =====
  // Mỗi tiệm là 1 User riêng; các User ADMIN cùng accountGroupId được đổi qua lại.
  // Luôn dùng prismaUnscoped vì thao tác vốn cross-shop.

  async listLinkedShops(userId: string) {
    const me = await prismaUnscoped.user.findUnique({
      where: { id: userId },
      select: { id: true, accountGroupId: true },
    });
    if (!me) throw new NotFoundError('User not found');
    const users = await prismaUnscoped.user.findMany({
      where: me.accountGroupId
        ? { accountGroupId: me.accountGroupId, role: UserRole.ADMIN, isActive: true }
        : { id: me.id },
      include: { shop: { select: { id: true, name: true, slug: true, isActive: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return users
      .filter((u) => u.shop.isActive || u.id === me.id)
      .map((u) => ({
        shopId: u.shop.id,
        shopName: u.shop.name,
        shopSlug: u.shop.slug,
        email: u.email,
        isCurrent: u.id === me.id,
      }));
  },

  async linkShop(userId: string, input: LinkShopInput) {
    const me = await prismaUnscoped.user.findUnique({ where: { id: userId } });
    if (!me) throw new NotFoundError('User not found');

    const candidates = await prismaUnscoped.user.findMany({
      where: {
        email: input.email,
        role: UserRole.ADMIN,
        isActive: true,
        shopId: { not: me.shopId },
        shop: { isActive: true },
      },
    });
    // Chỉ liên kết tài khoản nào đúng mật khẩu (chứng minh quyền sở hữu).
    const matched = [];
    for (const c of candidates) {
      if (await comparePassword(input.password, c.password)) matched.push(c);
    }
    if (!matched.length) {
      throw new BadRequestError('Sai email/mật khẩu hoặc tài khoản không phải ADMIN của tiệm khác');
    }

    // Gộp tất cả nhóm liên quan thành 1 nhóm.
    const groupId =
      me.accountGroupId ?? matched.find((m) => m.accountGroupId)?.accountGroupId ?? randomUUID();
    const oldGroups = [
      ...new Set(
        [me.accountGroupId, ...matched.map((m) => m.accountGroupId)].filter(
          (g): g is string => !!g && g !== groupId,
        ),
      ),
    ];
    await prismaUnscoped.$transaction([
      prismaUnscoped.user.updateMany({
        where: { id: { in: [me.id, ...matched.map((m) => m.id)] } },
        data: { accountGroupId: groupId },
      }),
      ...(oldGroups.length
        ? [
            prismaUnscoped.user.updateMany({
              where: { accountGroupId: { in: oldGroups } },
              data: { accountGroupId: groupId },
            }),
          ]
        : []),
    ]);
    clearShopBadgeCache();
    return this.listLinkedShops(userId);
  },

  async unlinkShop(userId: string, shopId: string) {
    const me = await prismaUnscoped.user.findUnique({ where: { id: userId } });
    if (!me) throw new NotFoundError('User not found');
    if (!me.accountGroupId) throw new NotFoundError('Chưa liên kết tiệm nào');
    if (shopId === me.shopId) throw new BadRequestError('Không thể huỷ liên kết tiệm đang dùng');
    await prismaUnscoped.user.updateMany({
      where: { accountGroupId: me.accountGroupId, shopId },
      data: { accountGroupId: null },
    });
    clearShopBadgeCache();
    return this.listLinkedShops(userId);
  },

  async switchShop(userId: string, shopId: string) {
    const me = await prismaUnscoped.user.findUnique({ where: { id: userId } });
    if (!me) throw new NotFoundError('User not found');
    if (me.role !== UserRole.ADMIN || !me.accountGroupId) {
      throw new ForbiddenError('Tài khoản chưa liên kết tiệm khác');
    }
    const target = await prismaUnscoped.user.findFirst({
      where: {
        accountGroupId: me.accountGroupId,
        shopId,
        role: UserRole.ADMIN,
        isActive: true,
        shop: { isActive: true },
      },
      include: { shop: { select: { name: true } } },
    });
    if (!target) throw new ForbiddenError('Không có quyền truy cập tiệm này');
    const token = signToken({
      sub: target.id,
      email: target.email,
      role: target.role as UserRole,
      shopId: target.shopId,
    });
    return { token, user: { ...toPublicUser(target), shopName: target.shop.name } };
  },

  /**
   * 1 máy chỉ nhận thông báo của tài khoản đang đăng nhập. Ngoại lệ: chủ quản lý
   * nhiều tiệm (các ADMIN cùng accountGroupId) → máy nhận thông báo của MỌI tiệm
   * đã liên kết. Token bị gỡ khỏi mọi user khác (kể cả tiệm khác) đang giữ nó.
   */
  async updateFcmToken(userId: string, fcmToken: string) {
    const me = await prismaUnscoped.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, accountGroupId: true },
    });
    if (!me) throw new NotFoundError('User not found');
    const groupIds =
      me.role === UserRole.ADMIN && me.accountGroupId
        ? (
            await prismaUnscoped.user.findMany({
              where: { accountGroupId: me.accountGroupId, role: UserRole.ADMIN, isActive: true },
              select: { id: true },
            })
          ).map((u) => u.id)
        : [];
    const owners = [...new Set([me.id, ...groupIds])];
    await prismaUnscoped.$transaction([
      prismaUnscoped.user.updateMany({
        where: { fcmToken, id: { notIn: owners } },
        data: { fcmToken: null },
      }),
      prismaUnscoped.user.updateMany({ where: { id: { in: owners } }, data: { fcmToken } }),
    ]);
  },

  /** Đăng xuất: máy này thôi nhận thông báo (gỡ khỏi user + danh sách POS). */
  async clearFcmToken(userId: string) {
    const me = await prismaUnscoped.user.findUnique({ where: { id: userId }, select: { fcmToken: true } });
    if (!me?.fcmToken) return;
    await prismaUnscoped.user.updateMany({ where: { fcmToken: me.fcmToken }, data: { fcmToken: null } });
    await removeFromPosLists([me.fcmToken]);
  },
};
