import { Injectable, Logger } from '@nestjs/common';

import { EventsGateway } from '../events/events.gateway';
import { PrismaService } from '../prisma/prisma.service';
import type { AccessAttempt, AccessStatus, Direction } from './access.types';

@Injectable()
export class AccessService {
  private readonly logger = new Logger(AccessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  /**
   * ตัดสินสิทธิ์ + บันทึก log ในขั้นตอนเดียว
   *
   * granted ต่อเมื่อ "มีแถวใน Users" และ "isActive = true"
   * บัตรที่ไม่รู้จักหรือถูกปิดใช้งาน -> denied แต่ยังบันทึก log ไว้เสมอ
   * (บัตรไม่รู้จักจะได้ userId = null)
   */
  async authorize(
    uid: string,
    direction: Direction,
    imagePath: string | null,
  ): Promise<AccessAttempt> {
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
        imagePath,
        userId: user?.id ?? null,
      },
    });

    this.logResult(normalized, direction, status, user);

    const attempt: AccessAttempt = {
      id: log.id,
      uid: log.uid,
      direction: log.direction,
      status: log.status,
      imagePath: log.imagePath,
      userName: user?.name ?? null,
      createdAt: log.createdAt.toISOString(),
    };

    // ยิงหลังบันทึก DB สำเร็จแล้วเท่านั้น dashboard จะได้ไม่เห็นรายการที่ยังไม่ถูกบันทึก
    this.events.emitAccess(attempt);

    return attempt;
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
      this.logger.log(`GRANTED uid=${uid} direction=${direction} (${user?.name ?? ''})`);
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
