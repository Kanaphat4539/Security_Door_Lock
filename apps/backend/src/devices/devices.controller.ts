import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { DeviceRoute } from '../auth/auth.constants';
import { CamRegistryService } from './cam-registry.service';

function isIpv4(v: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(v);
}
function sourceIp(req: Request): string {
  // req.ip อาจเป็น IPv4-mapped IPv6 (::ffff:192.168.x.x) ตัด prefix ออก
  return (req.ip ?? '').replace(/^::ffff:/, '');
}

@Controller('devices')
export class DevicesController {
  constructor(private readonly camRegistry: CamRegistryService) {}

  /**
   * ESP32-CAM เรียกตอนบูตเพื่อรายงาน IP ของตัวเอง
   * ส่ง body { "ip": "192.168.x.x" } มา หรือไม่ส่งก็ได้ (จะใช้ IP ต้นทางของ request แทน)
   * ใช้ DEVICE_TOKEN เดียวกับ POST /access
   */
  @Post('cam/register')
  @DeviceRoute()
  registerCam(
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ): { ok: boolean; ip: string } {
    const fromBody = typeof body.ip === 'string' ? body.ip.trim() : '';
    const ip = isIpv4(fromBody) ? fromBody : sourceIp(req);
    this.camRegistry.register(ip);
    return { ok: true, ip };
  }

  /** ดูสถานะ CAM ที่ register ไว้ (ต้องมี session หรือ DASHBOARD_TOKEN) */
  @Get('cam')
  camStatus(): { ip: string | null; lastSeen: string | null } {
    return this.camRegistry.status();
  }
}
