/**
 * Tạo tài khoản PlatformAdmin (superadmin quản lý nhiều tiệm) đầu tiên.
 * Chạy tay 1 lần lúc bootstrap — từ đó về sau quản lý tiệm qua trang
 * /platform trên web, không cần chạy script này nữa.
 *
 *   npx tsx src/scripts/create-platform-admin.ts <email> <password> <name>
 */
import { prismaUnscoped } from '../config/prisma';
import { hashPassword } from '../helpers/utils/hash';

async function main() {
  const [email, password, name] = process.argv.slice(2);
  if (!email || !password || !name) {
    console.error('Usage: npx tsx src/scripts/create-platform-admin.ts <email> <password> <name>');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('Password must be at least 6 characters');
    process.exit(1);
  }

  const existed = await prismaUnscoped.platformAdmin.findUnique({ where: { email } });
  if (existed) {
    console.error(`PlatformAdmin with email ${email} already exists`);
    process.exit(1);
  }

  const hashed = await hashPassword(password);
  const admin = await prismaUnscoped.platformAdmin.create({
    data: { email, password: hashed, name },
  });
  console.log(`Created PlatformAdmin: ${admin.email} (${admin.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prismaUnscoped.$disconnect());
