import { PrismaClient } from '@prisma/client';
import { isProd } from './env';
import { getCurrentShopId } from '../helpers/context/tenant-context';

/**
 * Client CHƯA scope theo tiệm. Chỉ dùng để:
 *  - bootstrap auth (đọc User trước khi biết shopId, xem middlewares/auth.ts)
 *  - resolve Shop công khai theo slug (chưa có JWT/ALS, xem settings.service.ts)
 *  - script migration/seed nội bộ (backfill-shop.ts, create-shop.ts)
 * TUYỆT ĐỐI không dùng trong service nghiệp vụ bình thường — sẽ bỏ qua cô lập
 * dữ liệu giữa các tiệm.
 */
export const prismaUnscoped = new PrismaClient({
  log: isProd ? ['error'] : ['warn', 'error'],
});

// Allowlist (không phải denylist): model mới thêm sau này mặc định KHÔNG được
// tự động scope theo shopId, phải khai báo rõ ở đây mới an toàn (fail-closed).
const TENANT_MODELS = new Set([
  'User',
  'Customer',
  'Product',
  'Order',
  'Booking',
  'BookingItem',
  'OrderItem',
  'ScanHistory',
  'Supplier',
  'Transaction',
  'CustomerDebt',
  'SupplierDebt',
  'InventoryItem',
  'InventoryLog',
  'Shift',
  'ShiftAttendance',
]);
// ShopSettings (khoá 1-1 theo shopId) và BankTransaction/BankAccountShopMapping
// (webhook không có JWT) được scope thủ công ở service riêng của chúng — cố ý
// không nằm trong allowlist này.

/**
 * Client đã $extends: mọi query find/update/delete/count/aggregate/groupBy
 * trên các model tenant-scoped tự động được AND thêm `shopId` vào `where`.
 * Hợp lệ với findUnique/update/delete nhờ Prisma hỗ trợ "extended where
 * unique fields" (cho phép thêm field lọc khác ngoài field unique, ổn định
 * từ Prisma 4.16 — không cần preview flag). create/createMany/upsert.create
 * tự động gắn `shopId` vào `data`. shopId lấy từ AsyncLocalStorage
 * (helpers/context/tenant-context.ts), được set đúng 1 lần ở middlewares/auth.ts
 * ngay sau khi xác thực token — mọi controller/service phía sau tự động nằm
 * trong đúng context, không cần sửa cách gọi `prisma.*` hiện có.
 */
export const prisma = prismaUnscoped.$extends({
  name: 'tenant-scope',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!model || !TENANT_MODELS.has(model)) return query(args);
        const a = args as Record<string, any>;

        switch (operation) {
          case 'findUnique':
          case 'findUniqueOrThrow':
          case 'findFirst':
          case 'findFirstOrThrow':
          case 'findMany':
          case 'update':
          case 'updateMany':
          case 'delete':
          case 'deleteMany':
          case 'count':
          case 'aggregate':
          case 'groupBy':
            return query({ ...a, where: { ...a.where, shopId: getCurrentShopId() } });

          case 'create':
            return query({ ...a, data: { ...a.data, shopId: getCurrentShopId() } });

          case 'createMany': {
            const shopId = getCurrentShopId();
            const data = Array.isArray(a.data)
              ? a.data.map((d: Record<string, any>) => ({ ...d, shopId }))
              : { ...a.data, shopId };
            return query({ ...a, data });
          }

          case 'upsert': {
            const shopId = getCurrentShopId();
            return query({
              ...a,
              where: { ...a.where, shopId },
              create: { ...a.create, shopId },
            });
          }

          default:
            return query(args);
        }
      },
    },
  },
});

export type DB = typeof prisma;
