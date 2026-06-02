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

/**
 * Chuẩn hoá input quyền từ FE (mảng key đang bật HOẶC object {key:true})
 * về map {key: true} để lưu DB & cho userHasPermission đọc.
 */
export const normalizePermissionInput = (
  raw: string[] | Record<string, unknown> | undefined | null,
): PermissionMap => {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const out: PermissionMap = {};
    for (const key of raw) {
      if (typeof key === 'string' && key) out[key as Permission] = true;
    }
    return out;
  }
  return parsePermissionMap(raw);
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
