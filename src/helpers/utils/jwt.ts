import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { UnauthorizedError } from './errors';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
}

export const signToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as SignOptions['expiresIn'],
  });

export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, env.jwt.secret) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
};
