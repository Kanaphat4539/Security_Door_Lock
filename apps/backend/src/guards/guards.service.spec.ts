jest.mock('../../generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { GuardsService } from './guards.service';

const prismaMock = {
  admin: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
  inviteCode: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
};

describe('GuardsService', () => {
  let service: GuardsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuardsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<GuardsService>(GuardsService);
  });

  describe('findAll', () => {
    it('ดึงรายชื่อ GUARD ทั้งหมด', async () => {
      prismaMock.admin.findMany.mockResolvedValue([
        { id: 2, username: 'guard1', role: 'GUARD' },
      ]);

      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(prismaMock.admin.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: 'GUARD' } }),
      );
    });
  });

  describe('findOne', () => {
    it('คืน GUARD เมื่อพบ id', async () => {
      prismaMock.admin.findFirst.mockResolvedValue({
        id: 2,
        username: 'guard1',
        role: 'GUARD',
      });

      const result = await service.findOne(2);
      expect(result.username).toBe('guard1');
    });

    it('โยน NotFoundException เมื่อไม่พบ id', async () => {
      prismaMock.admin.findFirst.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('ลบ GUARD สำเร็จ', async () => {
      prismaMock.admin.findFirst.mockResolvedValue({
        id: 2,
        username: 'guard1',
        role: 'GUARD',
      });
      prismaMock.admin.delete.mockResolvedValue({});

      const result = await service.remove(2);
      expect(result.message).toContain('guard1');
      expect(prismaMock.admin.delete).toHaveBeenCalledWith({
        where: { id: 2 },
      });
    });

    it('โยน NotFoundException เมื่อไม่พบ GUARD ที่ต้องการลบ', async () => {
      prismaMock.admin.findFirst.mockResolvedValue(null);
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createInviteCode', () => {
    it('สร้างรหัสเชิญแบบสุ่มสำเร็จ', async () => {
      prismaMock.inviteCode.findUnique.mockResolvedValue(null);
      prismaMock.inviteCode.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 1, ...data, isUsed: false }),
      );

      const result = await service.createInviteCode();
      expect(result.code).toMatch(/^GUARD-/);
    });

    it('สร้างรหัสเชิญที่ระบุเองได้', async () => {
      prismaMock.inviteCode.findUnique.mockResolvedValue(null);
      prismaMock.inviteCode.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 1, ...data, isUsed: false }),
      );

      const result = await service.createInviteCode('MY-CODE-123');
      expect(result.code).toBe('MY-CODE-123');
    });

    it('โยน ConflictException ถ้ารหัสเชิญซ้ำ', async () => {
      prismaMock.inviteCode.findUnique.mockResolvedValue({
        id: 1,
        code: 'DUP',
      });
      await expect(service.createInviteCode('DUP')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('removeInviteCode', () => {
    it('ยกเลิกรหัสเชิญสำเร็จ', async () => {
      prismaMock.inviteCode.findUnique.mockResolvedValue({
        id: 1,
        code: 'GUARD-DEL',
      });
      prismaMock.inviteCode.delete.mockResolvedValue({});

      const result = await service.removeInviteCode(1);
      expect(result.message).toContain('GUARD-DEL');
    });

    it('โยน NotFoundException เมื่อไม่พบรหัสเชิญที่จะลบ', async () => {
      prismaMock.inviteCode.findUnique.mockResolvedValue(null);
      await expect(service.removeInviteCode(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
