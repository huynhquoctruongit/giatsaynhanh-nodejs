import type { Request, Response, NextFunction } from 'express';
import { UserRole } from '../helpers/enums';
import type { Permission } from '../helpers/enums';
import { ForbiddenError, UnauthorizedError } from '../helpers/utils/errors';
import { verifyToken, type JwtPayload } from '../helpers/utils/jwt';
import { parsePermissionMap, userHasPermission, type PermissionMap } from '../helpers/utils/permissions';
import { prisma } from '../config/prisma';

export interface AuthUser extends JwtPayload {
  permissions: PermissionMap;
  orderViewTimeLimit: string;
  isActive: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const loadAuthUser = async (token: string): Promise<AuthUser> => {
  const payload = verifyToken(token);
  const dbUser = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      permissions: true,
      orderViewTimeLimit: true,
    },
  });
  if (!dbUser || !dbUser.isActive) {
    throw new UnauthorizedError('Account disabled or removed');
  }
  return {
    sub: dbUser.id,
    email: dbUser.email,
    role: dbUser.role as UserRole,
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
    next();
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
  }
  next();
};
