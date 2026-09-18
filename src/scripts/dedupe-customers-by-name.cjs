/**
 * XEM TRƯỚC (read-only) các nhóm khách hàng TRÙNG TÊN CHÍNH XÁC
 * (so khớp nguyên văn, phân biệt hoa/thường & khoảng trắng).
 *
 * Script này KHÔNG thay đổi gì. Việc gộp thật + thêm unique index được làm
 * atomic trong migration `*_customer_name_unique` (chạy: npx prisma migrate deploy).
 *
 *   node src/scripts/dedupe-customers-by-name.cjs
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ log: ['error'] });

async function main() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { orders: true, bookings: true, debts: true } } },
  });

  const groups = new Map();
  for (const c of customers) {
    const key = c.name; // trùng CHÍNH XÁC — không chuẩn hoá
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }

  let dupGroups = 0;
  let rowsToDelete = 0;
  let ordersToRelink = 0;
  let bookingsToRelink = 0;
  let debtsToRelink = 0;
  const sample = [];

  for (const [name, list] of groups) {
    if (list.length < 2) continue;
    dupGroups++;
    const dups = list.slice(1);
    rowsToDelete += dups.length;
    for (const d of dups) {
      ordersToRelink += d._count.orders;
      bookingsToRelink += d._count.bookings;
      debtsToRelink += d._count.debts;
    }
    if (sample.length < 20) {
      sample.push(`  "${name}" — ${list.length} bản ghi (giữ bản cũ nhất, xoá ${dups.length})`);
    }
  }

  console.log('=== XEM TRƯỚC: DEDUPE KHÁCH THEO TÊN CHÍNH XÁC (read-only) ===');
  console.log(`Tổng khách hàng hiện có:          ${customers.length}`);
  console.log(`Số nhóm tên bị trùng:             ${dupGroups}`);
  console.log(`Số bản ghi sẽ bị XOÁ:             ${rowsToDelete}`);
  console.log(`Khách hàng còn lại sau gộp:       ${customers.length - rowsToDelete}`);
  console.log(`Đơn hàng cần chuyển sang bản giữ: ${ordersToRelink}`);
  console.log(`Lịch đặt cần chuyển sang bản giữ: ${bookingsToRelink}`);
  console.log(`Công nợ cần chuyển sang bản giữ:  ${debtsToRelink}`);
  console.log('--- Ví dụ vài nhóm trùng ---');
  console.log(sample.join('\n') || '  (không có nhóm trùng)');
  console.log('\nKhông có gì bị thay đổi. Để gộp thật + khoá trùng tên, chạy:');
  console.log('  npx prisma migrate deploy');
}

main()
  .catch((err) => { console.error('FAILED:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
