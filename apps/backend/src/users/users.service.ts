import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      // ให้ dashboard แสดงได้เลยว่าใครทาบบัตรไปกี่ครั้ง
      include: { _count: { select: { logs: true } } },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (user === null) {
      throw new NotFoundException(`ไม่พบผู้ใช้ id=${id}`);
    }
    return user;
  }

  async create(dto: CreateUserDto) {
    // เช็คก่อนเพื่อให้ได้ error ที่อ่านรู้เรื่อง แทน P2002 ดิบ ๆ จาก Prisma
    const existing = await this.prisma.user.findUnique({
      where: { uid: dto.uid },
    });
    if (existing !== null) {
      throw new ConflictException(
        `บัตร ${dto.uid} ถูกผูกกับ "${existing.name}" อยู่แล้ว`,
      );
    }

    return this.prisma.user.create({
      data: {
        uid: dto.uid,
        name: dto.name,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id); // โยน 404 ถ้าไม่มี
    return this.prisma.user.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    // AccessLog ไม่ถูกลบตาม — onDelete: SetNull ทำให้ userId กลายเป็น null
    // ประวัติความปลอดภัยต้องอยู่ต่อแม้ผู้ใช้ถูกลบ
    await this.prisma.user.delete({ where: { id } });
    return { deleted: true, id };
  }

  /**
   * ประวัติเข้า-ออกของผู้ใช้คนเดียว (หน้า User Management ใช้แสดงย้อนหลัง)
   *
   * คืนรูปแบบเดียวกับ AccessService.getRecent() เป๊ะ ๆ เพื่อให้ frontend
   * ใช้ตารางตัวเดียวกันได้ — ต้องเติม userName เองด้วย ไม่งั้นตารางจะขึ้นว่า
   * "ไม่รู้จัก" ทั้งที่เป็นประวัติของคนคนนี้อยู่แล้ว
   */
  async findLogs(id: number, limit = 50) {
    const user = await this.findOne(id);

    const logs = await this.prisma.accessLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      uid: log.uid,
      direction: log.direction,
      status: log.status,
      imagePath: log.imagePath,
      userName: user.name,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  /**
   * UID ที่เคยถูกทาบแต่ยังไม่มีเจ้าของ
   * ใช้ตอนลงทะเบียนบัตรใหม่: ทาบบัตรที่เครื่องอ่าน แล้วมาเลือกจากลิสต์นี้
   * แทนที่จะต้องไปอ่าน UID จาก log เอง
   */
  async findUnassignedUids() {
    const rows = await this.prisma.accessLog.groupBy({
      by: ['uid'],
      where: { userId: null },
      _count: { uid: true },
      _max: { createdAt: true },
    });

    // log เก่าที่เกิด "ก่อน" ผูกบัตรจะมี userId เป็น null ตลอดไป
    // ถ้าไม่กรองออก บัตรที่ลงทะเบียนแล้วจะยังโผล่มาให้กดเพิ่มซ้ำ (แล้วได้ 409)
    const registered = await this.prisma.user.findMany({
      where: { uid: { in: rows.map((row) => row.uid) } },
      select: { uid: true },
    });
    const registeredUids = new Set(registered.map((user) => user.uid));

    return rows
      .filter((row) => !registeredUids.has(row.uid))
      .map((row) => ({
        uid: row.uid,
        attempts: row._count.uid,
        lastSeenAt: row._max.createdAt?.toISOString() ?? null,
      }))
      .sort((a, b) => (a.lastSeenAt ?? '') < (b.lastSeenAt ?? '') ? 1 : -1);
  }
}
