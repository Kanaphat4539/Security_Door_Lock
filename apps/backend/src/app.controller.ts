import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/auth.constants';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** health check — เปิดไว้ไม่ต้องใช้ token เพื่อให้เช็คได้ว่าเซิร์ฟเวอร์ยังอยู่ */
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
