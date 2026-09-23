import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { UnauthorizedError } from './errors';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
  shopId: string;
}

export const signToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as SignOptions['expiresIn'],
  });

export const verifyToken = (token: string): JwtPayload => {
  try {
    const payload = jwt.verify(token, env.jwt.secret) as JwtPayload | PlatformJwtPayload;
    if ('type' in payload && payload.type === 'platform') {
      throw new UnauthorizedError('Invalid or expired token');
    }
    return payload as JwtPayload;
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError('Invalid or expired token');
  }
};

/**
 * Token cho PlatformAdmin (superadmin quản lý nhiều tiệm) — có field `type`
 * riêng để không bao giờ bị lẫn/dùng thay cho JwtPayload của nhân viên tiệm.
 */
export interface PlatformJwtPayload {
  sub: string;
  email: string;
  type: 'platform';
}

export const signPlatformToken = (payload: PlatformJwtPayload) =>
  jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as SignOptions['expiresIn'],
  });

export const verifyPlatformToken = (token: string): PlatformJwtPayload => {
  try {
    const payload = jwt.verify(token, env.jwt.secret) as JwtPayload | PlatformJwtPayload;
    if (!('type' in payload) || payload.type !== 'platform') {
      throw new UnauthorizedError('Invalid or expired token');
    }
    return payload;
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError('Invalid or expired token');
  }
};
