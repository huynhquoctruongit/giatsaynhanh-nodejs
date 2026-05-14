import type { Permission } from '../enums/permissions';
import { UserRole } from '../enums';

export type PermissionMap = Partial<Record<Permission, boolean>>;

export const parsePermissionMap = (raw: unknown): PermissionMap => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: PermissionMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'boolean') {
      out[key as Permission] = value;
    }
  }
  return out;
};

export const userHasPermission = (
  role: string | undefined,
  permissions: PermissionMap | undefined,
  key: Permission,
): boolean => {
  if (role === UserRole.ADMIN) return true;
  if (!permissions) return false;
  if (permissions[key] === true) return true;
  if (permissions['admin.owner_level'] === true) return true;
  return false;
};
