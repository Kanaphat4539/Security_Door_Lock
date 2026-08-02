import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { Public, SESSION_ADMIN_ID, SESSION_ROLE } from './auth.constants';
import { AuthService, SESSION_TTL_SECONDS, type Role } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type AuthedRequest = Request & {
  [SESSION_ADMIN_ID]?: number;
  [SESSION_ROLE]?: Role;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * ตรวจรหัสผ่านแล้วออก session token
   *
   * @Public เพราะยังไม่มี credential ตอนเรียก — แต่ตัว route เองตรวจรหัสผ่านอยู่แล้ว
   * ฝั่ง Next จะเอา token ที่ได้ไปเก็บใน cookie แบบ httpOnly (JS อ่านไม่ได้)
   */
  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
  ): Promise<{ token: string; expiresIn: number }> {
    const token = await this.authService.login(dto.username, dto.password);
    return { token, expiresIn: SESSION_TTL_SECONDS };
  }

  /**
   * สมัครบัญชีเอง — ต้องมี invite code ที่ตรงกับ ADMIN_INVITE_CODE ใน .env
   * สมัครได้แค่ role USER (ดู AuthService.register)
   */
  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
  ): Promise<{ token: string; expiresIn: number }> {
    const token = await this.authService.register(
      dto.username,
      dto.password,
      dto.inviteCode,
    );
    return { token, expiresIn: SESSION_TTL_SECONDS };
  }

  /** ข้อมูลบัญชีที่ล็อกอินอยู่ — frontend ใช้ตัดสินว่าจะโชว์เมนูไหนบ้าง */
  @Get('me')
  me(@Req() request: AuthedRequest): { id: number; role: Role } {
    return {
      id: request[SESSION_ADMIN_ID] ?? 0,
      // static DASHBOARD_TOKEN ไม่ได้ผูกกับบัญชีคน ถือว่าเทียบเท่า ADMIN
      role: request[SESSION_ROLE] ?? 'ADMIN',
    };
  }

  /**
   * แลก session -> ตั๋วอายุสั้นสำหรับต่อ WebSocket
   * ต้องมี session token อยู่แล้ว (guard ตรวจให้ก่อนเข้ามาถึงตรงนี้)
   */
  @Post('ws-ticket')
  async wsTicket(
    @Req() request: AuthedRequest,
  ): Promise<{ ticket: string; expiresIn: number }> {
    return this.authService.issueWsTicket(request[SESSION_ADMIN_ID] ?? 0);
  }
}
