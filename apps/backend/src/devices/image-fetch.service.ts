import { Injectable, Logger } from '@nestjs/common';
import { writeFile } from 'fs/promises';
import { join } from 'path';

import { CamRegistryService } from './cam-registry.service';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads';
const FETCH_TIMEOUT_MS = 4000;

/**
 * ดึงรูปสดจาก ESP32-CAM (GET /capture) แล้วเซฟลง uploads/
 *
 * ใช้ตอนขาเข้า (direction = "in") เพื่อเก็บภาพหลักฐาน
 * ไม่โยน error — รูปเป็นแค่หลักฐานเสริม ถ้าดึงไม่ได้ระบบต้องทำงานต่อได้
 */
@Injectable()
export class ImageFetchService {
  private readonly logger = new Logger(ImageFetchService.name);

  constructor(private readonly camRegistry: CamRegistryService) {}

  /** คืน path เช่น "uploads/xxx.jpg" หรือ null ถ้าดึงไม่ได้ */
  async fetchFromCam(): Promise<string | null> {
    const url = this.camRegistry.getCaptureUrl();
    if (url === null) {
      this.logger.warn(
        'ยังไม่รู้ IP ของ CAM (ยังไม่ register และไม่มี CAM_CAPTURE_URL) — ข้ามการดึงรูป',
      );
      return null;
    }

    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        this.logger.warn(
          `ดึงรูปจาก CAM ไม่สำเร็จ: HTTP ${res.status} (${url})`,
        );
        return null;
      }

      const buf = Buffer.from(await res.arrayBuffer());
      const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
      await writeFile(join(process.cwd(), UPLOAD_DIR, filename), buf);
      this.logger.log(`เซฟรูปจาก CAM: ${filename} (${buf.length} bytes)`);
      return `${UPLOAD_DIR}/${filename}`;
    } catch (err) {
      this.logger.warn(`ดึงรูปจาก CAM error: ${(err as Error).message}`);
      return null;
    }
  }
}
