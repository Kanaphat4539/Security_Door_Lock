import 'dotenv/config';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const dbUrlString = process.env.DATABASE_URL;
    if (!dbUrlString) {
      throw new Error('DATABASE_URL environment variable is not defined');
    }

    const dbUrl = new URL(dbUrlString);
    const adapter = new PrismaMariaDb({
      host: dbUrl.hostname || 'localhost',
      port: Number(dbUrl.port) || 3306,
      user: dbUrl.username,
      password: decodeURIComponent(dbUrl.password || ''),
      database: dbUrl.pathname.replace(/^\//, ''),
      connectionLimit: 10,
    });

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
