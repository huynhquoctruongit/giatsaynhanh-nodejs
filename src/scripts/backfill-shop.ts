/**
 * Backfill shopId cho toàn bộ dữ liệu hiện có: tạo (hoặc tái dùng) 1 Shop đại
 * diện tiệm đang vận hành, rồi gán shopId đó cho mọi record cũ đang NULL.
 * Chạy SAU migration step1 (20260923100000_multitenant_step1_additive — đã
 * thêm cột shopId nullable), TRƯỚC khi chạy manual-step2-lockdown.sql.
 *
 *   npx tsx src/scripts/backfill-shop.ts "<Tên tiệm>" <slug> [phone] [address]
 *
 * Idempotent: chạy lại nhiều lần không sao — nếu Shop với slug đó đã tồn tại
 * thì dùng lại, và chỉ UPDATE các row còn "shopId" IS NULL.
 */
import { prismaUnscoped } from '../config/prisma';

const TENANT_TABLES = [
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
  'ShopSettings',
  'BankTransaction',
] as const;

async function main() {
  const [name, slug, phone, address] = process.argv.slice(2);
  if (!name || !slug) {
    console.error(
      'Usage: npx tsx src/scripts/backfill-shop.ts "<Tên tiệm>" <slug> [phone] [address]',
    );
    process.exit(1);
  }

  let shop = await prismaUnscoped.shop.findUnique({ where: { slug } });
  if (!shop) {
    shop = await prismaUnscoped.shop.create({ data: { name, slug, phone, address } });
    console.log(`Created Shop: ${shop.name} (${shop.id})`);
  } else {
    console.log(`Reusing existing Shop: ${shop.name} (${shop.id})`);
  }

  for (const table of TENANT_TABLES) {
    const count = await prismaUnscoped.$executeRawUnsafe(
      `UPDATE "${table}" SET "shopId" = $1 WHERE "shopId" IS NULL`,
      shop.id,
    );
    console.log(`  ${table}: backfilled ${count} row(s)`);
  }

  const remainingNull = await Promise.all(
    TENANT_TABLES.filter((t) => t !== 'BankTransaction').map(async (table) => {
      const rows = await prismaUnscoped.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*)::bigint AS count FROM "${table}" WHERE "shopId" IS NULL`,
      );
      return { table, count: Number(rows[0].count) };
    }),
  );
  const stillNull = remainingNull.filter((r) => r.count > 0);
  if (stillNull.length > 0) {
    console.error('WARNING: some rows still have shopId IS NULL:', stillNull);
    process.exit(1);
  }

  console.log('Backfill complete. All tables (except BankTransaction, nullable by design) have shopId set.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prismaUnscoped.$disconnect());
