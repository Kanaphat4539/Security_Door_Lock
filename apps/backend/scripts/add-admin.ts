/**
 * สร้าง/เปลี่ยนรหัสผ่านบัญชีเข้า dashboard
 *
 *   npm run db:add-admin -- <username> <password>
 *   npm run db:add-admin -- admin "รหัสผ่านที่เดายาก"
 *
 * ถ้ามี username นั้นอยู่แล้วจะเปลี่ยนรหัสผ่านให้
 * ⚠️ รหัสผ่านจะติดอยู่ใน history ของ shell — เปลี่ยนทีหลังได้ด้วยคำสั่งเดิม
 */
import 'dotenv/config';

import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { PrismaClient } from '../generated/prisma/client';
import { hashPassword } from '../src/auth/password';

async function main(): Promise<void> {
  const [username, password] = process.argv.slice(2);

  if (!username || !password) {
    console.error('ใช้: npm run db:add-admin -- <username> <password>');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร');
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(process.env.DATABASE_URL as string),
  });

  try {
    const passwordHash = await hashPassword(password);

    // สคริปต์นี้คือทางเดียวที่จะได้ role ADMIN
    // (สมัครผ่านหน้าเว็บได้แค่ USER) รันซ้ำกับ username เดิม = เลื่อนขั้นเป็น ADMIN
    const admin = await prisma.admin.upsert({
      where: { username },
      update: { passwordHash, role: 'ADMIN' },
      create: { username, passwordHash, role: 'ADMIN' },
    });
    console.log(
      `OK: "${admin.username}" (id=${admin.id}) role=${admin.role} พร้อมใช้งาน`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
