// เหตุผลเดียวกับ spec อื่น — jest resolve การ import แบบ .js ในซอร์ส .ts
// ของ Prisma client ไม่ได้
jest.mock('../../generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { hashPassword } from './password';

const prismaMock = {
  admin: { findUnique: jest.fn(), create: jest.fn() },
};

const jwtMock = { signAsync: jest.fn(), verifyAsync: jest.fn() };

const INVITE = 'secret-invite-code';

describe('AuthService.register', () => {
  let service: AuthService;
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    jest.clearAllMocks();
    jwtMock.signAsync.mockResolvedValue('signed.jwt');
    process.env.ADMIN_INVITE_CODE = INVITE;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('สมัครสำเร็จเมื่อ invite code ถูกต้อง', async () => {
    prismaMock.admin.findUnique.mockResolvedValue(null);
    prismaMock.admin.create.mockResolvedValue({
      id: 1,
      username: 'newbie',
      role: 'USER',
    });

    await expect(
      service.register('newbie', 'password123', INVITE),
    ).resolves.toBe('signed.jwt');
  });

  it('สมัครแล้วได้ role USER เสมอ ไม่ใช่ ADMIN', async () => {
    prismaMock.admin.findUnique.mockResolvedValue(null);
    prismaMock.admin.create.mockResolvedValue({
      id: 1,
      username: 'newbie',
      role: 'USER',
    });

    await service.register('newbie', 'password123', INVITE);

    expect(prismaMock.admin.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'USER' }),
      }),
    );
  });

  it('invite code ผิด -> 403 และไม่สร้างบัญชี', async () => {
    await expect(
      service.register('newbie', 'password123', 'wrong-code'),
    ).rejects.toThrow(ForbiddenException);
    expect(prismaMock.admin.create).not.toHaveBeenCalled();
  });

  it('ไม่ได้ตั้ง ADMIN_INVITE_CODE -> ปิดการสมัครทั้งหมด (fail-closed)', async () => {
    delete process.env.ADMIN_INVITE_CODE;

    await expect(
      service.register('newbie', 'password123', ''),
    ).rejects.toThrow(ForbiddenException);
    expect(prismaMock.admin.create).not.toHaveBeenCalled();
  });

  it('ตั้ง ADMIN_INVITE_CODE เป็นค่าว่าง ก็ยังปิดการสมัคร', async () => {
    process.env.ADMIN_INVITE_CODE = '';

    await expect(service.register('newbie', 'pw12345678', '')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('username ซ้ำ -> 409', async () => {
    prismaMock.admin.findUnique.mockResolvedValue({ id: 1, username: 'taken' });

    await expect(
      service.register('taken', 'password123', INVITE),
    ).rejects.toThrow(ConflictException);
    expect(prismaMock.admin.create).not.toHaveBeenCalled();
  });

  it('ไม่เก็บรหัสผ่านเป็น plaintext', async () => {
    prismaMock.admin.findUnique.mockResolvedValue(null);
    prismaMock.admin.create.mockResolvedValue({
      id: 1,
      username: 'newbie',
      role: 'USER',
    });

    await service.register('newbie', 'sup3rs3cret', INVITE);

    const passed = prismaMock.admin.create.mock.calls[0][0].data.passwordHash;
    expect(passed).not.toContain('sup3rs3cret');
    expect(passed.startsWith('scrypt:')).toBe(true);
  });
});

describe('AuthService.login', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jwtMock.signAsync.mockResolvedValue('signed.jwt');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('ใส่ role ลงใน JWT payload ด้วย', async () => {
    // hash ของ 'correct-password' จริง ๆ เพื่อให้ verifyPassword ผ่าน
    prismaMock.admin.findUnique.mockResolvedValue({
      id: 3,
      username: 'boss',
      role: 'ADMIN',
      passwordHash: await hashPassword('correct-password'),
    });

    await service.login('boss', 'correct-password');

    expect(jwtMock.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 3, username: 'boss', role: 'ADMIN' }),
      expect.anything(),
    );
  });
});
