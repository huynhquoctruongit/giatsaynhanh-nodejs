import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

const UserRole = { ADMIN: 'ADMIN', STAFF: 'STAFF' } as const;
const OrderStatus = {
  CREATED: 'CREATED',
  RECEIVED: 'RECEIVED',
  WASHING: 'WASHING',
  READY: 'READY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@laundry.local' },
    update: {},
    create: {
      email: 'admin@laundry.local',
      password: passwordHash,
      name: 'Admin',
      role: UserRole.ADMIN,
    },
  });

  const staffHash = await bcrypt.hash('staff123', 10);
  await prisma.user.upsert({
    where: { email: 'staff@laundry.local' },
    update: {},
    create: {
      email: 'staff@laundry.local',
      password: staffHash,
      name: 'Nhân viên 1',
      role: UserRole.STAFF,
    },
  });

  const customer = await prisma.customer.upsert({
    where: { phone: '0901234567' },
    update: {},
    create: {
      name: 'Nguyễn Văn A',
      phone: '0901234567',
      address: '123 Đường ABC, Quận 1, TP.HCM',
      note: 'Khách quen, ưu tiên giao buổi sáng',
    },
  });

  const productSeed = [
    { name: 'Áo sơ mi', unit: 'cái', price: 20000 },
    { name: 'Quần tây', unit: 'cái', price: 30000 },
    { name: 'Áo vest', unit: 'cái', price: 80000 },
    { name: 'Chăn mỏng', unit: 'cái', price: 70000 },
    { name: 'Chăn dày', unit: 'cái', price: 120000 },
    { name: 'Mền/Drap', unit: 'cái', price: 50000 },
    { name: 'Giặt sấy theo cân', unit: 'kg', price: 25000 },
  ];

  const products = await Promise.all(
    productSeed.map((p) =>
      prisma.product.upsert({
        where: { id: p.name },
        update: {},
        create: p,
      }).catch(async () => {
        const found = await prisma.product.findFirst({ where: { name: p.name } });
        if (found) return found;
        return prisma.product.create({ data: p });
      }),
    ),
  );

  const existedOrder = await prisma.order.findFirst({
    where: { customerId: customer.id },
  });

  if (!existedOrder) {
    const shirt = products.find((p) => p.name === 'Áo sơ mi');
    const pants = products.find((p) => p.name === 'Quần tây');
    await prisma.order.create({
      data: {
        code: `LD-DEMO-${Math.floor(Math.random() * 9000 + 1000)}`,
        qrToken: randomUUID(),
        customerId: customer.id,
        status: OrderStatus.CREATED,
        totalAmount: 120000,
        note: 'Giặt khô áo vest',
        createdById: admin.id,
        items: {
          create: [
            {
              productId: shirt?.id,
              name: 'Áo sơ mi',
              quantity: 3,
              weight: 1.2,
              unitPrice: 20000,
            },
            {
              productId: pants?.id,
              name: 'Quần tây',
              quantity: 2,
              weight: 1.0,
              unitPrice: 30000,
            },
          ],
        },
      },
    });
  }

  console.log('[seed] Done. Login: admin@laundry.local / admin123');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
