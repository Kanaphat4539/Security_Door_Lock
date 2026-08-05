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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { existsSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

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
   * รับ multipart/form-data จาก ESP32-CAM
   *   fields: uid, direction ("in" | "out")
   *   file:   image (เฉพาะขาเข้า — ขาออกไม่ส่งมา)
   *
   * ตอบกลับ { "status": "granted" | "denied" } เสมอ
   * ฝั่ง firmware อ่านผลด้วยการ indexOf หา substring ไม่ได้ parse JSON เต็ม
   */
  @Post()
  @DeviceRoute() // ESP32-CAM ใช้ DEVICE_TOKEN เรียก route นี้ได้
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          // ชื่อไฟล์: <iso-timestamp>_<direction>_<uid>.jpg
          // ใช้ - แทน : เพราะ Windows ห้ามใช้ : ในชื่อไฟล์
          const stamp = new Date().toISOString().replace(/[:.]/g, '-');
          const ext = extname(file.originalname) || '.jpg';
          cb(null, `${stamp}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // ภาพ SVGA ปกติ < 100KB
    }),
  )
  async handleAccess(
    @Body() body: Record<string, unknown>,
    @UploadedFile() image?: Express.Multer.File,
  ): Promise<AccessResponse> {
    const uid = typeof body.uid === 'string' ? body.uid.trim() : '';
    const direction = body.direction;

    if (uid.length === 0) {
      throw new BadRequestException('missing uid');
    }
    if (!isDirection(direction)) {
      throw new BadRequestException('direction must be "in" or "out"');
    }

    // เก็บภาพไว้ทั้งกรณี granted และ denied (denied เก็บเป็นหลักฐาน)
    const imagePath = image ? `${UPLOAD_DIR}/${image.filename}` : null;

    const attempt = await this.accessService.authorize(
      uid,
      direction,
      imagePath,
    );

    return { status: attempt.status };
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
  getImage(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): void {
    // กัน path traversal: ยอมรับเฉพาะชื่อไฟล์ที่ backend เป็นคนตั้งเองเท่านั้น
    if (!/^[0-9A-Za-z._-]+$/.test(filename) || filename.includes('..')) {
      throw new BadRequestException('ชื่อไฟล์ไม่ถูกต้อง');
    }

    const fullPath = join(process.cwd(), UPLOAD_DIR, filename);
    if (!existsSync(fullPath)) {
      throw new NotFoundException('ไม่พบไฟล์ภาพนี้');
    }

    res.sendFile(fullPath);
  }
}
