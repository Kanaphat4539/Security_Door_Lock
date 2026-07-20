// ต้องมาก่อน import อื่น เพื่อให้ DATABASE_URL ถูกโหลดก่อน PrismaClient ถูกสร้าง
import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthService } from './auth/auth.service';
import { TokenAuthGuard } from './auth/token-auth.guard';

/**
 * ไม่ยอมบูตถ้าไม่ได้ตั้ง token — ป้องกันการเผลอรันแบบเปิดโล่ง
 * (guard fail-closed อยู่แล้วถ้า token ว่าง แต่จะได้ 401 ทุก request
 *  โดยไม่รู้สาเหตุ สู้บอกตั้งแต่ตอนบูตชัดกว่า)
 */
function assertTokens(): void {
  const missing = ['DASHBOARD_TOKEN', 'DEVICE_TOKEN', 'JWT_SECRET'].filter(
    (key) => (process.env[key] ?? '').length === 0,
  );

  if (missing.length > 0) {
    throw new Error(
      `ไม่ได้ตั้ง ${missing.join(' และ ')} ใน .env — ` +
        'ดูวิธีสร้าง token ที่ backend/.env.example',
    );
  }
}

async function bootstrap() {
  assertTokens();

  const app = await NestFactory.create(AppModule);

  // validate + แปลงชนิดข้อมูลตาม DTO ให้อัตโนมัติ
  // ไม่กระทบ POST /access เพราะ body ที่นั่นไม่ได้ผูกกับคลาส DTO
  // (ValidationPipe ข้าม metatype ที่เป็น native type)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // ตัด field ที่ไม่ได้ประกาศใน DTO ทิ้ง
      transform: true, // แปลง payload เป็นอินสแตนซ์ของ DTO (ให้ @Transform ทำงาน)
    }),
  );

  // ทุก route ต้องมี credential ยกเว้นที่ติด @Public()
  app.useGlobalGuards(
    new TokenAuthGuard(app.get(Reflector), app.get(AuthService)),
  );

  // 3001 ไม่ใช่ 3000 เพราะ Next.js dashboard ใช้ 3000 อยู่แล้ว
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
