import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

// Global เพื่อให้ module อื่น (Access, Users, Dashboard ที่จะทำต่อ)
// inject PrismaService ได้โดยไม่ต้อง import ซ้ำทุกที่
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
