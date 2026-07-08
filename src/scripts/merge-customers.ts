import { prisma } from '../config/prisma';

async function main() {
  console.log('--- CUSTOMER MERGING & BACKFILL SCRIPT ---');

  // 1. Group customers by phone number
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const phoneGroups: Record<string, typeof customers> = {};

  for (const c of customers) {
    if (!c.phone) continue;
    const norm = c.phone.replace(/\s+/g, '').trim();
    if (!norm) continue;
    if (!phoneGroups[norm]) {
      phoneGroups[norm] = [];
    }
    phoneGroups[norm].push(c);
  }

  let mergedCount = 0;
  let ordersUpdated = 0;
  let bookingsUpdated = 0;
  let debtsUpdated = 0;

  for (const [phone, list] of Object.entries(phoneGroups)) {
    if (list.length < 2) continue;

    const primary = list[0];
    const duplicates = list.slice(1);

    console.log(`Merging duplicates for phone ${phone}. Primary ID: ${primary.id} (${primary.name})`);

    for (const dup of duplicates) {
      console.log(`  - Duplicate ID: ${dup.id} (${dup.name})`);

      // In a transaction, re-link and delete
      await prisma.$transaction(async (tx) => {
        // Re-link Orders
        const ordRes = await tx.order.updateMany({
          where: { customerId: dup.id },
          data: { customerId: primary.id },
        });
        ordersUpdated += ordRes.count;

        // Re-link Bookings
        const bkRes = await tx.booking.updateMany({
          where: { customerId: dup.id },
          data: { customerId: primary.id },
        });
        bookingsUpdated += bkRes.count;

        // Re-link CustomerDebts
        const debtRes = await tx.customerDebt.updateMany({
          where: { customerId: dup.id },
          data: { customerId: primary.id },
        });
        debtsUpdated += debtRes.count;

        // If duplicate has notes/address that are missing in primary, merge them
        const updateData: any = {};
        if (!primary.address && dup.address) {
          updateData.address = dup.address;
          primary.address = dup.address; // update local representation
        }
        if (!primary.note && dup.note) {
          updateData.note = dup.note;
          primary.note = dup.note; // update local representation
        }
        if (Object.keys(updateData).length > 0) {
          await tx.customer.update({
            where: { id: primary.id },
            data: updateData,
          });
        }

        // Delete duplicate customer
        await tx.customer.delete({
          where: { id: dup.id },
        });
        mergedCount++;
      });
    }
  }

  console.log(`Merged ${mergedCount} duplicate customers.`);
  console.log(`Updated ${ordersUpdated} orders, ${bookingsUpdated} bookings, ${debtsUpdated} customer debts.`);

  // 2. Backfill readyAt column
  console.log('\n--- BACKFILLING readyAt COLUMN ---');
  
  console.log('Running raw SQL queries for precise readyAt backfill...');
  
  const backfillReady = await prisma.$executeRawUnsafe(
    `UPDATE "Order" SET "readyAt" = "createdAt" WHERE "status" = 'READY' AND "readyAt" IS NULL`
  );
  const backfillDelivered = await prisma.$executeRawUnsafe(
    `UPDATE "Order" SET "readyAt" = COALESCE("deliveredAt", "createdAt") WHERE "status" = 'DELIVERED' AND "readyAt" IS NULL`
  );

  console.log(`Raw SQL backfill complete:`);
  console.log(`  - Updated ${backfillReady} READY orders to use createdAt`);
  console.log(`  - Updated ${backfillDelivered} DELIVERED orders to use deliveredAt/createdAt`);
  
  console.log('--- DONE ---');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
