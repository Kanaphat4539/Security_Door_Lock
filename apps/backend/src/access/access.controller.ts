import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { existsSync } from 'fs';
import { join } from 'path';

import { DeviceRoute } from '../auth/auth.constants';
import { AccessService } from './access.service';
import {
  isDirection,
  type AccessAttempt,
  type AccessResponse,
} from './access.types';

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads';

@Controller('access')
export class AccessController {
  private readonly logger = new Logger(AccessController.name);

  constructor(private readonly accessService: AccessService) {}

  /**
   * รับ JSON จาก ESP32 main (Design B): { "uid": "...", "direction": "in" | "out" }
   * main ต่อ Wi-Fi เอง ส่งแค่ข้อมูล — รูปอยู่ที่ CAM แยก backend ไปดึงเองตอนขาเข้า
   *
   * ตอบ { "status": "granted" | "denied" } ทันที (ประตูไม่รอโหลดรูป)
   */
  @Post()
  @DeviceRoute() // ESP32 main ใช้ DEVICE_TOKEN เรียก route นี้ได้
  handleAccess(@Body() body: Record<string, unknown>): Promise<AccessResponse> {
    const uid = typeof body.uid === 'string' ? body.uid.trim() : '';
    const direction = body.direction;

    if (uid.length === 0) {
      throw new BadRequestException('missing uid');
    }
    if (!isDirection(direction)) {
      throw new BadRequestException('direction must be "in" or "out"');
    }

    return this.accessService.handleAccess(uid, direction);
  }

  /** ดู log ล่าสุด ใช้ตอนทดสอบฮาร์ดแวร์ และเป็นฐานให้ dashboard ต่อไป */
  @Get('recent')
  getRecent(): Promise<AccessAttempt[]> {
    return this.accessService.getRecent();
  }

  /** ตัวเลขสำหรับ KPI cards */
  @Get('stats')
  getStats() {
    return this.accessService.getStats();
  }

  /**
   * ส่งไฟล์ภาพให้ dashboard (ต้องมี DASHBOARD_TOKEN)
   *
   * ไม่ใช้ static file serving เพราะจะเปิดโล่งให้ใครก็โหลดภาพใบหน้าได้
   * ชื่อไฟล์เป็น timestamp ซึ่งเดาได้ไม่ยาก
   *
   * <img src> แนบ header เองไม่ได้ ฝั่ง frontend จึงต้อง fetch เป็น blob
   * แล้วค่อยสร้าง object URL (ดู components/AuthImage.tsx)
   */
  @Get('image/:filename')
  getImage(@Param('filename') filename: string, @Res() res: Response): void {
    // กัน path traversal: ยอมรับเฉพาะชื่อไฟล์ที่ backend เป็นคนตั้งเองเท่านั้น
    if (!/^[0-9A-Za-z._-]+$/.test(filename) || filename.includes('..')) {
      throw new BadRequestException('ชื่อไฟล์ไม่ถูกต้อง');
    }

    const fullPath = join(process.cwd(), UPLOAD_DIR, filename);
    if (!existsSync(fullPath)) {
      throw new NotFoundException('ไม่พบไฟล์ภาพนี้');
    }

    // บังคับชนิดไฟล์เป็น JPEG + nosniff — ต่อให้มีไฟล์แปลกปลอมหลุดเข้ามา
    // เบราว์เซอร์จะไม่รันเป็น HTML/สคริปต์ (กัน stored XSS ผ่านภาพ)
    res.set({
      'Content-Type': 'image/jpeg',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    });
    res.sendFile(fullPath);
  }
}
