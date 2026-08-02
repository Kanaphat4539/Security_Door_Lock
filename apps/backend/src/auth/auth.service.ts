import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../prisma/prisma.service';
import { hashPassword, verifyPassword } from './password';

/** อายุ session ของ dashboard */
export const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 ชั่วโมง

/**
 * ตั๋วสำหรับต่อ WebSocket — อายุสั้นมากโดยตั้งใจ
 *
 * เบราว์เซอร์ต่อ WebSocket ตรงไปที่ Nest จึงต้องถือ credential บางอย่างไว้จริง ๆ
 * แทนที่จะให้ DASHBOARD_TOKEN (ซึ่งไม่มีวันหมดอายุและเรียก REST ได้ทุก route)
 * เราออกตั๋วใบเล็กที่ใช้ได้แค่ต่อ WebSocket และหมดอายุใน 60 วินาที
 */
export const WS_TICKET_TTL_SECONDS = 60;

export type Role = 'ADMIN' | 'USER';

export interface SessionPayload {
  sub: number;
  username: string;
  role: Role;
  typ: 'session';
}

interface WsTicketPayload {
  sub: number;
  typ: 'ws';
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(username: string, password: string): Promise<string> {
    const admin = await this.prisma.admin.findUnique({ where: { username } });

    // เทียบรหัสผ่านเสมอแม้ไม่เจอ user เพื่อไม่ให้เดาได้จากเวลาที่ใช้ตอบว่ามี
    // username นี้อยู่จริงไหม (user enumeration)
    const stored =
      admin?.passwordHash ??
      'scrypt:00000000000000000000000000000000:' + '0'.repeat(128);
    const ok = await verifyPassword(password, stored);

    if (admin === null || !ok) {
      this.logger.warn(`ล็อกอินไม่สำเร็จ username=${username}`);
      throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    return this.signSession({
      sub: admin.id,
      username: admin.username,
      role: admin.role,
      typ: 'session',
    });
  }

  /**
   * สมัครบัญชีเองผ่านหน้าเว็บ — ต้องมี invite code ที่ตรงกับ ADMIN_INVITE_CODE
   *
   * สมัครได้แค่ role USER เท่านั้น ต่อให้รู้ invite code ก็ยังจัดการบัตรไม่ได้
   * ถ้าจะให้ใครเป็น ADMIN ต้องรัน `npm run db:add-admin` จากเครื่องที่รัน backend
   * (invite code รั่วจึงเสียหายจำกัด)
   */
  async register(
    username: string,
    password: string,
    inviteCode: string,
  ): Promise<string> {
    const expected = process.env.ADMIN_INVITE_CODE ?? '';

    // ไม่ได้ตั้ง invite code = ปิดการสมัครไปเลย (fail-closed)
    if (expected.length === 0) {
      this.logger.warn('มีคนพยายามสมัครแต่ยังไม่ได้ตั้ง ADMIN_INVITE_CODE');
      throw new ForbiddenException('ระบบยังไม่เปิดให้สมัครสมาชิก');
    }

    if (inviteCode !== expected) {
      this.logger.warn(`สมัครไม่สำเร็จ username=${username} — invite code ผิด`);
      throw new ForbiddenException('รหัสเชิญไม่ถูกต้อง');
    }

    const existing = await this.prisma.admin.findUnique({ where: { username } });
    if (existing !== null) {
      throw new ConflictException('ชื่อผู้ใช้นี้ถูกใช้แล้ว');
    }

    const admin = await this.prisma.admin.create({
      data: {
        username,
        passwordHash: await hashPassword(password),
        role: 'USER',
      },
    });

    this.logger.log(`สมัครบัญชีใหม่ username=${admin.username} role=USER`);

    return this.signSession({
      sub: admin.id,
      username: admin.username,
      role: admin.role,
      typ: 'session',
    });
  }

  /** ตรวจ session token คืน payload ถ้าใช้ได้ ไม่งั้นคืน null */
  async verifySession(token: string): Promise<SessionPayload | null> {
    try {
      const payload = await this.jwt.verifyAsync<SessionPayload>(token);
      return payload.typ === 'session' ? payload : null;
    } catch {
      return null;
    }
  }

  /** แลก session -> ตั๋วอายุสั้นสำหรับต่อ WebSocket */
  async issueWsTicket(adminId: number): Promise<{
    ticket: string;
    expiresIn: number;
  }> {
    const payload: WsTicketPayload = { sub: adminId, typ: 'ws' };
    const ticket = await this.jwt.signAsync(payload, {
      expiresIn: WS_TICKET_TTL_SECONDS,
    });
    return { ticket, expiresIn: WS_TICKET_TTL_SECONDS };
  }

  /** ตรวจตั๋ว WebSocket — ต้องเป็น typ 'ws' เท่านั้น */
  async verifyWsTicket(ticket: string): Promise<boolean> {
    try {
      const payload = await this.jwt.verifyAsync<WsTicketPayload>(ticket);
      return payload.typ === 'ws';
    } catch {
      return false;
    }
  }

  private signSession(payload: SessionPayload): Promise<string> {
    return this.jwt.signAsync(payload, { expiresIn: SESSION_TTL_SECONDS });
  }
}
