import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import {
  extractBearer,
  IS_ADMIN_ONLY,
  IS_DEVICE_ROUTE,
  IS_PUBLIC,
  SESSION_ADMIN_ID,
  SESSION_ROLE,
  tokenMatches,
} from './auth.constants';
import { AuthService, type Role } from './auth.service';

type AuthedRequest = Request & {
  [SESSION_ADMIN_ID]?: number;
  [SESSION_ROLE]?: Role;
};

/**
 * ตรวจ credential ของทุก REST route (ติดเป็น global guard ใน main.ts)
 *
 * รับได้ 3 แบบ:
 *   1. session token ของบัญชี dashboard (JWT)  — คนที่ล็อกอิน
 *   2. DASHBOARD_TOKEN (static)                 — สคริปต์/เครื่องมือ dev/curl
 *   3. DEVICE_TOKEN (static)                    — ESP32-CAM เฉพาะ @DeviceRoute()
 *
 * และถ้า route ติด @AdminOnly() จะต้องเป็น role ADMIN ด้วย
 */
@Injectable()
export class TokenAuthGuard implements CanActivate {
  private readonly logger = new Logger(TokenAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.readMeta(context, IS_PUBLIC);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const provided = extractBearer(request.headers.authorization);

    if (provided === null) {
      throw new UnauthorizedException(
        'ต้องมี header Authorization: Bearer <token>',
      );
    }

    const adminOnly = this.readMeta(context, IS_ADMIN_ONLY);

    // 1) session ของบัญชีที่ล็อกอินแล้ว
    const session = await this.authService.verifySession(provided);
    if (session !== null) {
      request[SESSION_ADMIN_ID] = session.sub;
      request[SESSION_ROLE] = session.role;

      if (adminOnly && session.role !== 'ADMIN') {
        this.logger.warn(
          `ปฏิเสธ ${request.method} ${request.url} — ` +
            `${session.username} เป็น role ${session.role} ไม่ใช่ ADMIN`,
        );
        throw new ForbiddenException('ต้องเป็นผู้ดูแลระบบเท่านั้น');
      }

      return true;
    }

    // 2) static token ของ dashboard (สคริปต์/curl) — ถือว่าเทียบเท่า ADMIN
    if (tokenMatches(provided, process.env.DASHBOARD_TOKEN ?? '')) return true;

    // 3) static token ของบอร์ด — เฉพาะ route ที่ติด @DeviceRoute()
    const isDeviceRoute = this.readMeta(context, IS_DEVICE_ROUTE);
    if (
      isDeviceRoute &&
      tokenMatches(provided, process.env.DEVICE_TOKEN ?? '')
    ) {
      return true;
    }

    // ไม่บอกว่าผิดเพราะ token ผิดหรือเพราะสิทธิ์ไม่พอ กันการไล่เดา
    this.logger.warn(
      `ปฏิเสธ ${request.method} ${request.url} — token ไม่ถูกต้องหรือสิทธิ์ไม่พอ`,
    );
    throw new UnauthorizedException(
      'token ไม่ถูกต้องหรือไม่มีสิทธิ์เรียก route นี้',
    );
  }

  private readMeta(context: ExecutionContext, key: string): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(key, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false
    );
  }
}
