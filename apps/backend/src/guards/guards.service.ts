import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GuardsService {
  constructor(private readonly prisma: PrismaService) {}

  /** ดูรายชื่อบัญชี GUARD ทั้งหมด */
  async findAll() {
    return this.prisma.admin.findMany({
      where: { role: 'GUARD' },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** ดูข้อมูล GUARD คนเดียว */
  async findOne(id: number) {
    const guard = await this.prisma.admin.findFirst({
      where: { id, role: 'GUARD' },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!guard) {
      throw new NotFoundException('ไม่พบบัญชีผู้ช่วย (GUARD)');
    }

    return guard;
  }

  /** ลบบัญชี GUARD ออกจากระบบ */
  async remove(id: number) {
    const guard = await this.prisma.admin.findFirst({
      where: { id, role: 'GUARD' },
    });

    if (!guard) {
      throw new NotFoundException('ไม่พบบัญชีผู้ช่วย (GUARD) ที่ต้องการลบ');
    }

    await this.prisma.admin.delete({ where: { id } });

    return {
      message: `ลบบัญชีผู้ช่วย "${guard.username}" เรียบร้อยแล้ว`,
    };
  }

  /**
   * ADMIN สร้างรหัสเชิญใหม่สำหรับผู้ที่จะมาเป็น GUARD
   * แบบ User ต่อ User (ใช้ได้ครั้งเดียว) และมีเวลาจำกัด
   *
   * @param expiresInMinutes จำนวนนาทีที่รหัสใช้งานได้ (ค่าเริ่มต้น 60 นาที = 1 ชั่วโมง)
   * @param customCode รหัสที่ระบุเอง (ถ้ามี)
   */
  async createInviteCode(expiresInMinutes = 60, customCode?: string) {
    let code: string;

    if (customCode && customCode.trim().length > 0) {
      code = customCode.trim().toUpperCase();
      const existing = await this.prisma.inviteCode.findUnique({
        where: { code },
      });
      if (existing) {
        throw new ConflictException('รหัสเชิญนี้มีอยู่ในระบบแล้ว');
      }
    } else {
      // สุ่มรหัสใหม่ที่ไม่ซ้ำ เช่น GUARD-7A8B-9C0D
      let attempts = 0;
      do {
        const rand = randomBytes(4).toString('hex').toUpperCase();
        code = `GUARD-${rand.slice(0, 4)}-${rand.slice(4)}`;
        const found = await this.prisma.inviteCode.findUnique({
          where: { code },
        });
        if (!found) break;
        attempts++;
      } while (attempts < 10);
    }

    const minutes = Number(expiresInMinutes);
    const validMinutes = !isNaN(minutes) && minutes > 0 ? minutes : 60;
    const expiresAt = new Date(Date.now() + validMinutes * 60 * 1000);

    return this.prisma.inviteCode.create({
      data: {
        code,
        expiresAt,
      },
    });
  }

  /** ดูรายการรหัสเชิญทั้งหมด พร้อมคำนวณสถานะ */
  async findAllInviteCodes() {
    const now = new Date();
    const codes = await this.prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return codes.map((c) => {
      let status: 'active' | 'used' | 'expired';
      if (c.isUsed) {
        status = 'used';
      } else if (c.expiresAt && now > c.expiresAt) {
        status = 'expired';
      } else {
        status = 'active';
      }

      return {
        ...c,
        status,
      };
    });
  }

  /** ลบ/ยกเลิกรหัสเชิญ ("เมื่อจะลบก็ลบไปเลย") */
  async removeInviteCode(id: number) {
    const record = await this.prisma.inviteCode.findUnique({ where: { id } });

    if (!record) {
      throw new NotFoundException('ไม่พบรหัสเชิญนี้');
    }

    await this.prisma.inviteCode.delete({ where: { id } });

    return {
      success: true,
      message: `ลบรหัสเชิญ "${record.code}" เรียบร้อยแล้ว`,
    };
  }
}
