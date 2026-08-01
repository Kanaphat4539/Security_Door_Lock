import { Module, OnModuleInit } from '@nestjs/common';
import { mkdirSync } from 'fs';

import { DevicesModule } from '../devices/devices.module';
import { AccessController, UPLOAD_DIR } from './access.controller';
import { AccessService } from './access.service';

@Module({
  imports: [DevicesModule], // ใช้ ImageFetchService สำหรับดึงรูปจาก CAM
  controllers: [AccessController],
  providers: [AccessService],
})
export class AccessModule implements OnModuleInit {
  // ต้องมีโฟลเดอร์ uploads อยู่ก่อน ไม่งั้นตอนเซฟรูปจาก CAM จะพัง
  onModuleInit(): void {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}
