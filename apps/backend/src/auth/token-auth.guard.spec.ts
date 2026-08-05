// guard -> AuthService -> PrismaService -> Prisma client ที่ jest resolve ไม่ได้
// (ซอร์ส .ts ที่ import กันด้วยนามสกุล .js) จึง stub ทิ้งเหมือน spec อื่น
jest.mock('../../generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  IS_ADMIN_ONLY,
  IS_DEVICE_ROUTE,
  IS_PUBLIC,
  tokenMatches,
} from './auth.constants';
import type { AuthService } from './auth.service';
import { TokenAuthGuard } from './token-auth.guard';

const DASHBOARD = 'dashboard-token-aaaaaaaaaaaaaaaaaaaaaaaa';
const DEVICE = 'device-token-bbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const SESSION_JWT = 'a.valid.session.jwt';
const USER_JWT = 'a.valid.user.jwt';

const contextWith = (authorization?: string): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        headers: authorization ? { authorization } : {},
        method: 'GET',
        url: '/test',
      }),
    }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  }) as unknown as ExecutionContext;

describe('TokenAuthGuard', () => {
  let guard: TokenAuthGuard;
  let reflector: Reflector;
  let authService: AuthService;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    reflector = new Reflector();
    // session ถูกต้องเฉพาะ SESSION_JWT เท่านั้น
    authService = {
      verifySession: jest.fn((token: string) => {
        if (token === SESSION_JWT) {
          return Promise.resolve({
            sub: 7,
            username: 'admin',
            role: 'ADMIN' as const,
            typ: 'session' as const,
          });
        }
        if (token === USER_JWT) {
          return Promise.resolve({
            sub: 8,
            username: 'viewer',
            role: 'USER' as const,
            typ: 'session' as const,
          });
        }
        return Promise.resolve(null);
      }),
    } as unknown as AuthService;

    guard = new TokenAuthGuard(reflector, authService);
    process.env.DASHBOARD_TOKEN = DASHBOARD;
    process.env.DEVICE_TOKEN = DEVICE;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  const mockMetadata = (key: string | null) => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((requested: unknown) =>
        requested === key ? true : undefined,
      );
  };

  it('ปล่อยผ่านเมื่อ route ติด @Public()', async () => {
    mockMetadata(IS_PUBLIC);
    await expect(guard.canActivate(contextWith())).resolves.toBe(true);
  });

  it('ปฏิเสธเมื่อไม่มี header Authorization', async () => {
    mockMetadata(null);
    await expect(guard.canActivate(contextWith())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('ยอมรับ session token ของ admin ที่ล็อกอินแล้ว', async () => {
    mockMetadata(null);
    await expect(
      guard.canActivate(contextWith(`Bearer ${SESSION_JWT}`)),
    ).resolves.toBe(true);
  });

  it('ยอมรับ DASHBOARD_TOKEN บน route ทั่วไป', async () => {
    mockMetadata(null);
    await expect(
      guard.canActivate(contextWith(`Bearer ${DASHBOARD}`)),
    ).resolves.toBe(true);
  });

  it('ปฏิเสธ DEVICE_TOKEN บน route ทั่วไป (เช่น /users)', async () => {
    mockMetadata(null);
    await expect(
      guard.canActivate(contextWith(`Bearer ${DEVICE}`)),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('ยอมรับ DEVICE_TOKEN บน route ที่ติด @DeviceRoute()', async () => {
    mockMetadata(IS_DEVICE_ROUTE);
    await expect(
      guard.canActivate(contextWith(`Bearer ${DEVICE}`)),
    ).resolves.toBe(true);
  });

  it('ปฏิเสธ token มั่ว', async () => {
    mockMetadata(null);
    await expect(
      guard.canActivate(contextWith('Bearer wrong')),
    ).rejects.toThrow(UnauthorizedException);
  });

  describe('@AdminOnly()', () => {
    it('role USER เข้า route ทั่วไปได้ (เช่น /access/recent)', async () => {
      mockMetadata(null);
      await expect(
        guard.canActivate(contextWith(`Bearer ${USER_JWT}`)),
      ).resolves.toBe(true);
    });

    it('role USER โดน 403 บน route ที่ติด @AdminOnly()', async () => {
      mockMetadata(IS_ADMIN_ONLY);
      await expect(
        guard.canActivate(contextWith(`Bearer ${USER_JWT}`)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('role ADMIN ผ่าน route ที่ติด @AdminOnly()', async () => {
      mockMetadata(IS_ADMIN_ONLY);
      await expect(
        guard.canActivate(contextWith(`Bearer ${SESSION_JWT}`)),
      ).resolves.toBe(true);
    });

    it('DASHBOARD_TOKEN ยังผ่าน @AdminOnly() ได้ (เป็น credential ของสคริปต์)', async () => {
      mockMetadata(IS_ADMIN_ONLY);
      await expect(
        guard.canActivate(contextWith(`Bearer ${DASHBOARD}`)),
      ).resolves.toBe(true);
    });

    it('DEVICE_TOKEN ไม่ผ่าน @AdminOnly()', async () => {
      mockMetadata(IS_ADMIN_ONLY);
      await expect(
        guard.canActivate(contextWith(`Bearer ${DEVICE}`)),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

describe('tokenMatches', () => {
  it('ตรงกันเป๊ะถึงจะผ่าน', () => {
    expect(tokenMatches('abc123', 'abc123')).toBe(true);
    expect(tokenMatches('abc124', 'abc123')).toBe(false);
  });

  it('ความยาวต่างกันไม่ผ่าน และไม่โยน error', () => {
    expect(tokenMatches('short', 'muchlongertoken')).toBe(false);
  });

  it('ปฏิเสธเสมอเมื่อ token ฝั่งเซิร์ฟเวอร์ว่าง (fail-closed)', () => {
    expect(tokenMatches('', '')).toBe(false);
    expect(tokenMatches('anything', '')).toBe(false);
  });
});
