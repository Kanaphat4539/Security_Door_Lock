import { Injectable, Logger } from '@nestjs/common';

import { ImageFetchService } from '../devices/image-fetch.service';
import { EventsGateway } from '../events/events.gateway';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AccessAttempt,
  AccessResponse,
  AccessStatus,
  Direction,
} from './access.types';

@Injectable()
export class AccessService {
  private readonly logger = new Logger(AccessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    private readonly imageFetch: ImageFetchService,
  ) {}

  /**
   * รับคำขอจาก ESP32 main (Design B): main ส่งแค่ { uid, direction } มา
   *
   * ตอบ { status } กลับทันที (ประตูเปิดเร็ว ไม่รอโหลดรูป)
   * ถ้าเป็นขาเข้า จะไปดึงรูปจาก CAM เบื้องหลังแล้วค่อยยิง WebSocket ให้ dashboard
   */
  async handleAccess(
    uid: string,
    direction: Direction,
  ): Promise<AccessResponse> {
    const attempt = await this.authorize(uid, direction);

    if (direction === 'in') {
      // ขาเข้า: ดึงรูปจาก CAM เบื้องหลัง (ไม่ await -> ไม่บล็อกการตอบ)
      void this.attachImageThenEmit(attempt);
    } else {
      // ขาออก: ไม่มีรูป ยิง event ได้เลย
      this.events.emitAccess(attempt);
    }

    return { status: attempt.status };
  }

  /**
   * ตัดสินสิทธิ์ + บันทึก log (ยังไม่มีรูป — รูปมาทีหลังตอนขาเข้า)
   *
   * granted ต่อเมื่อ "มีแถวใน Users" และ "isActive = true"
   * บัตรที่ไม่รู้จักหรือถูกปิดใช้งาน -> denied แต่ยังบันทึก log ไว้เสมอ
   * (บัตรไม่รู้จักจะได้ userId = null)
   */
  async authorize(uid: string, direction: Direction): Promise<AccessAttempt> {
    const normalized = uid.trim().toUpperCase();

    const user = await this.prisma.user.findUnique({
      where: { uid: normalized },
    });

    const status: AccessStatus =
      user !== null && user.isActive ? 'granted' : 'denied';

    const log = await this.prisma.accessLog.create({
      data: {
        uid: normalized,
        direction,
        status,
        imagePath: null,
        userId: user?.id ?? null,
      },
    });

    this.logResult(normalized, direction, status, user);

    return {
      id: log.id,
      uid: log.uid,
      direction: log.direction,
      status: log.status,
      imagePath: log.imagePath,
      userName: user?.name ?? null,
      createdAt: log.createdAt.toISOString(),
    };
  }

  /**
   * ดึงรูปจาก CAM -> อัปเดต imagePath ของ log -> ยิง WebSocket
   * ทำเบื้องหลังหลังตอบ status ไปแล้ว (ประตูไม่ต้องรอ)
   * ยิง event ครั้งเดียวหลังได้รูป (หรือหลัง timeout ถ้าดึงไม่ได้) กันแถวซ้ำใน dashboard
   */
  private async attachImageThenEmit(attempt: AccessAttempt): Promise<void> {
    const imagePath = await this.imageFetch.fetchFromCam();

    if (imagePath !== null) {
      try {
        await this.prisma.accessLog.update({
          where: { id: attempt.id },
          data: { imagePath },
        });
      } catch (err) {
        this.logger.warn(
          `อัปเดต imagePath ไม่สำเร็จ (id=${attempt.id}): ${(err as Error).message}`,
        );
      }
    }

    this.events.emitAccess({ ...attempt, imagePath });
  }

  /** log ล่าสุด ใช้ตอนทดสอบฮาร์ดแวร์ และเป็นฐานให้ dashboard ต่อไป */
  async getRecent(limit = 50): Promise<AccessAttempt[]> {
    const logs = await this.prisma.accessLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { name: true } } },
    });

    return logs.map((log) => ({
      id: log.id,
      uid: log.uid,
      direction: log.direction,
      status: log.status,
      imagePath: log.imagePath,
      userName: log.user?.name ?? null,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  /** ตัวเลขสรุปสำหรับ KPI cards บน dashboard */
  async getStats() {
    // นับตั้งแต่เที่ยงคืนของวันนี้ตามเวลาเครื่องเซิร์ฟเวอร์
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [entriesToday, deniedToday, totalUsers, activeUsers] =
      await Promise.all([
        this.prisma.accessLog.count({
          where: {
            createdAt: { gte: startOfDay },
            direction: 'in',
            status: 'granted',
          },
        }),
        this.prisma.accessLog.count({
          where: { createdAt: { gte: startOfDay }, status: 'denied' },
        }),
        this.prisma.user.count(),
        this.prisma.user.count({ where: { isActive: true } }),
      ]);

    return { entriesToday, deniedToday, totalUsers, activeUsers };
  }

  private logResult(
    uid: string,
    direction: Direction,
    status: AccessStatus,
    user: { name: string; isActive: boolean } | null,
  ): void {
    if (status === 'granted') {
      this.logger.log(
        `GRANTED uid=${uid} direction=${direction} (${user?.name ?? ''})`,
      );
      return;
    }

    // แยกสองกรณีให้ชัด ตอน bring-up จะได้รู้ว่าต้องเพิ่มบัตรหรือแค่เปิดใช้งานบัตร
    if (user === null) {
      this.logger.warn(
        `DENIED  uid=${uid} direction=${direction} — ไม่พบบัตรใบนี้ในตาราง User ` +
          `(เพิ่มด้วย: npm run db:add-card -- ${uid} "ชื่อผู้ใช้")`,
      );
    } else {
      this.logger.warn(
        `DENIED  uid=${uid} direction=${direction} — บัตรของ ${user.name} ถูกปิดใช้งาน (isActive=false)`,
      );
    }
  }
}
