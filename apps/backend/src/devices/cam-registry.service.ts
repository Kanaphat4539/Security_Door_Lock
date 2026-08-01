import { Injectable, Logger } from '@nestjs/common';

/**
 * เก็บ IP ล่าสุดของ ESP32-CAM ไว้ในหน่วยความจำ
 *
 * ใน Design B บอร์ด CAM ต่อ Wi-Fi เอง (IP มาจาก DHCP ซึ่งเปลี่ยนได้)
 * CAM จึงรายงาน IP ตัวเองมาตอนบูตผ่าน POST /devices/cam/register
 * แล้ว backend เอา IP นี้ไปดึงรูปจาก http://<ip>/capture ตอนมีคนเข้า
 *
 * หมายเหตุ: เก็บใน memory ถ้า backend restart จะลืม IP จนกว่า CAM จะ register ใหม่
 * (CAM ควร register ซ้ำเป็นระยะ หรือใช้ env CAM_CAPTURE_URL เป็น fallback)
 */
@Injectable()
export class CamRegistryService {
  private readonly logger = new Logger(CamRegistryService.name);
  private ip: string | null = null;
  private lastSeen: Date | null = null;

  register(ip: string): void {
    if (ip !== this.ip) {
      this.logger.log(`CAM ลงทะเบียน IP = ${ip}`);
    }
    this.ip = ip;
    this.lastSeen = new Date();
  }

  /** URL /capture ของ CAM — ใช้ IP ที่ register ก่อน ถ้าไม่มีค่อยใช้ env fallback */
  getCaptureUrl(): string | null {
    if (this.ip !== null) return `http://${this.ip}/capture`;
    const fallback = process.env.CAM_CAPTURE_URL;
    return fallback && fallback.length > 0 ? fallback : null;
  }

  status(): { ip: string | null; lastSeen: string | null } {
    return { ip: this.ip, lastSeen: this.lastSeen?.toISOString() ?? null };
  }
}
