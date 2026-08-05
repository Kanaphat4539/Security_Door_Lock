import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { PrismaClient } from '../../generated/prisma/client';

/**
 * Prisma 7 บังคับให้ส่ง driver adapter เข้ามา ไม่อ่าน DATABASE_URL ให้เองแล้ว
 * MySQL ใช้ adapter ตัวเดียวกับ MariaDB (@prisma/adapter-mariadb)
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        'ไม่พบ DATABASE_URL — คัดลอก backend/.env.example เป็น backend/.env ' +
          'แล้วสั่ง `docker compose up -d` ที่ root ของ repo ก่อน',
      );
    }

    super({ adapter: new PrismaMariaDb(url) });
  }

  // ต่อ DB ตอนบูตเลย จะได้รู้ทันทีว่าต่อไม่ติด แทนที่จะไปพังตอน request แรก
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
