import {
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
   * (ระบุ code เองได้ หรือให้ระบบสุ่มแบบ GUARD-XXXXXXXX)
   */
  async createInviteCode(customCode?: string) {
    const code =
      customCode && customCode.trim().length > 0
        ? customCode.trim().toUpperCase()
        : `GUARD-${randomBytes(4).toString('hex').toUpperCase()}`;

    const existing = await this.prisma.inviteCode.findUnique({
      where: { code },
    });

    if (existing) {
      throw new ConflictException('รหัสเชิญนี้มีอยู่ในระบบแล้ว');
    }

    return this.prisma.inviteCode.create({
      data: { code },
    });
  }

  /** ดูรายการรหัสเชิญทั้งหมด */
  async findAllInviteCodes() {
    return this.prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /** ลบ/ยกเลิกรหัสเชิญ */
  async removeInviteCode(id: number) {
    const record = await this.prisma.inviteCode.findUnique({ where: { id } });

    if (!record) {
      throw new NotFoundException('ไม่พบรหัสเชิญนี้');
    }

    await this.prisma.inviteCode.delete({ where: { id } });

    return {
      message: `ยกเลิกรหัสเชิญ "${record.code}" เรียบร้อยแล้ว`,
    };
  }
}
