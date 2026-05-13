import { prisma } from '../../config/prisma';
import { hashPassword, comparePassword } from '../../helpers/utils/hash';
import { signToken } from '../../helpers/utils/jwt';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../helpers/utils/errors';
import type { LoginInput, RegisterInput } from '../../helpers/validators/auth.schema';
import { UserRole } from '../../helpers/enums';

const toPublicUser = (user: {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role as UserRole,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

export const authService = {
  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }
    const ok = await comparePassword(input.password, user.password);
    if (!ok) throw new UnauthorizedError('Invalid email or password');

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
    });
    return { token, user: toPublicUser(user) };
  },

  async register(input: RegisterInput) {
    const existed = await prisma.user.findUnique({ where: { email: input.email } });
    if (existed) throw new ConflictError('Email already in use');

    const password = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        password,
        name: input.name,
        role: input.role,
      },
    });
    return toPublicUser(user);
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');
    return toPublicUser(user);
  },
};
