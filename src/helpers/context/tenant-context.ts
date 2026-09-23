import { AsyncLocalStorage } from 'node:async_hooks';
import { UnauthorizedError } from '../utils/errors';

interface TenantStore {
  shopId: string;
}

export const tenantContext = new AsyncLocalStorage<TenantStore>();

/**
 * shopId của request hiện tại. Fail-closed: nếu chưa có context (bug ở
 * middleware, hoặc code chạy ngoài 1 request đã auth) thì throw thay vì
 * âm thầm trả về query không lọc theo tiệm.
 */
export const getCurrentShopId = (): string => {
  const store = tenantContext.getStore();
  if (!store?.shopId) {
    throw new UnauthorizedError('Missing tenant context (shopId)');
  }
  return store.shopId;
};

export const runWithShop = <T>(shopId: string, fn: () => T): T =>
  tenantContext.run({ shopId }, fn);
