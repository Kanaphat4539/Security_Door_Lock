import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// Global เพราะ TokenAuthGuard (global guard) และ EventsGateway ต้องใช้ AuthService
@Global()
@Module({
  imports: [
    JwtModule.register({
      // ตรวจตอนบูตแล้วว่ามีค่า (ดู assertSecrets ใน main.ts)
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
