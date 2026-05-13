import type { Request, Response, NextFunction } from 'express';
import { UserRole } from '../helpers/enums';
import { ForbiddenError, UnauthorizedError } from '../helpers/utils/errors';
import { verifyToken, type JwtPayload } from '../helpers/utils/jwt';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authStaff = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.header('authorization') ?? req.header('Authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    throw new UnauthorizedError('Missing Bearer token');
  }
  const token = header.slice(7).trim();
  req.user = verifyToken(token);
  next();
};

export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError();
    if (!roles.includes(req.user.role as UserRole)) {
      throw new ForbiddenError(`Requires role: ${roles.join(', ')}`);
    }
    next();
  };

export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.header('authorization') ?? req.header('Authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    next();
    return;
  }
  try {
    req.user = verifyToken(header.slice(7).trim());
  } catch {
    // ignore invalid token for public endpoints
  }
  next();
};
