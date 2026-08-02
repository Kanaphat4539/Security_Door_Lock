/**
 * เพิ่ม/อัปเดตบัตร RFID ลงตาราง User
 *
 *   npm run db:add-card -- <UID> "<ชื่อผู้ใช้>"
 *   npm run db:add-card -- A1B2C3D4 "ธีรภัทร ทองสิงห์"
 *
 * ถ้ามี UID นั้นอยู่แล้วจะอัปเดตชื่อและเปิดใช้งานบัตรให้
 * ใช้ตอน bring-up: ทาบบัตร -> ดู UID จาก log ที่ backend -> รันคำสั่งนี้
 */
import 'dotenv/config';

import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { PrismaClient } from '../generated/prisma/client';

async function main(): Promise<void> {
  const [rawUid, name] = process.argv.slice(2);

  if (!rawUid || !name) {
    console.error('ใช้: npm run db:add-card -- <UID> "<ชื่อผู้ใช้>"');
    process.exit(1);
  }

  // เก็บเป็นตัวพิมพ์ใหญ่เสมอ ให้ตรงกับที่ AccessService normalize ตอนค้นหา
  const uid = rawUid.trim().toUpperCase();

  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(process.env.DATABASE_URL as string),
  });
  try {
    const user = await prisma.user.upsert({
      where: { uid },
      update: { name, isActive: true },
      create: { uid, name },
    });
    console.log(`OK: uid=${user.uid} name=${user.name} isActive=${user.isActive}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
