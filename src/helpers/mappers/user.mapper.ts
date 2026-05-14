import type { User } from '@prisma/client';
import { parsePermissionMap } from '../utils/permissions';
import type { UserRole } from '../enums';

export const toPublicUser = (user: User) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  phone: user.phone,
  role: user.role as UserRole,
  permissions: parsePermissionMap(user.permissions),
  orderViewTimeLimit: user.orderViewTimeLimit,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export type PublicUser = ReturnType<typeof toPublicUser>;
