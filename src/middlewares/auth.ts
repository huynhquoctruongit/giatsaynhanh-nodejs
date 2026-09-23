import type { Request, Response, NextFunction } from 'express';
import { UserRole } from '../helpers/enums';
import type { Permission } from '../helpers/enums';
import { ForbiddenError, UnauthorizedError } from '../helpers/utils/errors';
import { verifyToken, verifyPlatformToken, type JwtPayload } from '../helpers/utils/jwt';
import { parsePermissionMap, userHasPermission, type PermissionMap } from '../helpers/utils/permissions';
import { prismaUnscoped } from '../config/prisma';
import { runWithShop } from '../helpers/context/tenant-context';

export interface AuthUser extends JwtPayload {
  permissions: PermissionMap;
  orderViewTimeLimit: string;
  isActive: boolean;
}

export interface PlatformAuthUser {
  sub: string;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      platformAdmin?: PlatformAuthUser;
    }
  }
}

// Dùng prismaUnscoped: tại thời điểm này shopId của request CHƯA được biết
// (chính là thứ ta đang tìm) nên chưa thể chạy trong tenant context.
const loadAuthUser = async (token: string): Promise<AuthUser> => {
  const payload = verifyToken(token);
  const dbUser = await prismaUnscoped.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      permissions: true,
      orderViewTimeLimit: true,
      shopId: true,
    },
  });
  if (!dbUser || !dbUser.isActive) {
    throw new UnauthorizedError('Account disabled or removed');
  }
  return {
    sub: dbUser.id,
    email: dbUser.email,
    role: dbUser.role as UserRole,
    shopId: dbUser.shopId,
    permissions: parsePermissionMap(dbUser.permissions),
    orderViewTimeLimit: dbUser.orderViewTimeLimit,
    isActive: dbUser.isActive,
  };
};

const extractBearer = (req: Request): string | null => {
  const header = req.header('authorization') ?? req.header('Authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) return null;
  return header.slice(7).trim();
};

export const authStaff = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const token = extractBearer(req);
    if (!token) throw new UnauthorizedError('Missing Bearer token');
    req.user = await loadAuthUser(token);
    // Mọi middleware/controller/service phía sau next() chạy trong cùng async
    // continuation này, nên tự động nằm trong tenant context của đúng shopId.
    runWithShop(req.user.shopId, next);
  } catch (err) {
    next(err);
  }
};

export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role as UserRole)) {
      return next(new ForbiddenError(`Requires role: ${roles.join(', ')}`));
    }
    next();
  };

export const requirePermission =
  (...keys: Permission[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    const allowed = keys.every((key) =>
      userHasPermission(req.user!.role, req.user!.permissions, key),
    );
    if (!allowed) {
      return next(
        new ForbiddenError(`Missing permission: ${keys.join(', ')}`),
      );
    }
    next();
  };

// Superadmin (quản lý nhiều tiệm) — KHÔNG chạy runWithShop vì thao tác vốn
// cross-shop; service của module platform luôn dùng prismaUnscoped tường minh.
export const authPlatform = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const token = extractBearer(req);
    if (!token) throw new UnauthorizedError('Missing Bearer token');
    const payload = verifyPlatformToken(token);
    const admin = await prismaUnscoped.platformAdmin.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, isActive: true },
    });
    if (!admin || !admin.isActive) {
      throw new UnauthorizedError('Account disabled or removed');
    }
    req.platformAdmin = { sub: admin.id, email: admin.email };
    next();
  } catch (err) {
    next(err);
  }
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const token = extractBearer(req);
  if (!token) return next();
  try {
    req.user = await loadAuthUser(token);
  } catch {
    // Silently ignore for public endpoints where auth is optional
    return next();
  }
  runWithShop(req.user.shopId, next);
};
