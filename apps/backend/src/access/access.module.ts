import { Module, OnModuleInit } from '@nestjs/common';
import { mkdirSync } from 'fs';

import { AccessController, UPLOAD_DIR } from './access.controller';
import { AccessService } from './access.service';

@Module({
  controllers: [AccessController],
  providers: [AccessService],
})
export class AccessModule implements OnModuleInit {
  // multer ไม่สร้างโฟลเดอร์ปลายทางให้เอง ต้องมีอยู่ก่อนไม่งั้น upload พัง
  onModuleInit(): void {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}
