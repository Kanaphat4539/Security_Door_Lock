// เหตุผลเดียวกับ access.service.spec.ts — jest resolve การ import แบบ .js
// ในซอร์ส .ts ของ Prisma client ไม่ได้
jest.mock('../../generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

const prismaMock = {
  admin: { findUnique: jest.fn() },
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  accessLog: { findMany: jest.fn(), groupBy: jest.fn() },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('admin can enable owner email for a cardholder without a dashboard account', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({ id: 1 });

      await service.create({
        uid: 'AAAA',
        name: 'Owner',
        email: 'owner@example.com',
        emailNotificationsEnabled: true,
      });

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          uid: 'AAAA',
          name: 'Owner',
          isActive: true,
          email: 'owner@example.com',
          emailNotificationsEnabled: true,
        },
      });
    });

    it('rejects enabling owner email without an address', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.create({ uid: 'AAAA', name: 'Owner', emailNotificationsEnabled: true }))
        .rejects.toThrow(BadRequestException);
    });
    it('stores the owner email and links only an available employee account', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.admin.findUnique.mockResolvedValue({ id: 9, role: 'GUARD' });
      prismaMock.user.create.mockResolvedValue({ id: 1 });

      await service.create({
        uid: 'AAAA',
        name: 'Owner',
        email: 'owner@example.com',
        dashboardUsername: 'employee',
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { dashboardAccountId: 9 },
      });
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          uid: 'AAAA',
          name: 'Owner',
          isActive: true,
          email: 'owner@example.com',
          dashboardAccountId: 9,
        },
      });
    });

    it('rejects linking an admin account as an employee owner', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.admin.findUnique.mockResolvedValue({ id: 9, role: 'ADMIN' });
      await expect(
        service.create({
          uid: 'AAAA',
          name: 'Owner',
          dashboardUsername: 'admin',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('rejects a dashboard account already linked to another card', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 7 });
      prismaMock.admin.findUnique.mockResolvedValue({ id: 9, role: 'GUARD' });
      await expect(
        service.create({
          uid: 'AAAA',
          name: 'Owner',
          dashboardUsername: 'employee',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('สร้างผู้ใช้ใหม่ได้เมื่อ uid ยังไม่ถูกใช้', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({ id: 1, uid: 'A1B2C3D4' });

      await service.create({ uid: 'A1B2C3D4', name: 'ธีรภัทร' });

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: { uid: 'A1B2C3D4', name: 'ธีรภัทร', isActive: true },
      });
    });

    it('โยน 409 เมื่อ uid ซ้ำ พร้อมบอกว่าเป็นบัตรของใคร', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        name: 'คนเดิม',
      });

      await expect(
        service.create({ uid: 'A1B2C3D4', name: 'คนใหม่' }),
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('ใช้ isActive ที่ส่งมาถ้ามี', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({ id: 1 });

      await service.create({ uid: 'AAAA', name: 'x', isActive: false });

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: { uid: 'AAAA', name: 'x', isActive: false },
      });
    });
  });

  describe('findOne', () => {
    it('โยน 404 เมื่อไม่พบผู้ใช้', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('admin can enable owner email on an existing cardholder', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 7, email: 'owner@example.com' });
      prismaMock.user.update.mockResolvedValue({ id: 7 });

      await service.update(7, { emailNotificationsEnabled: true });

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { emailNotificationsEnabled: true },
      });
    });

    it('rejects clearing email while enabling notifications', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 7, email: 'owner@example.com' });

      await expect(service.update(7, { email: null, emailNotificationsEnabled: true }))
        .rejects.toThrow(BadRequestException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
    it('turns off notifications when the owner email changes', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 7,
        email: 'old@example.com',
        dashboardAccountId: 9,
      });
      prismaMock.user.update.mockResolvedValue({ id: 7 });

      await service.update(7, { email: 'new@example.com' });

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { email: 'new@example.com', emailNotificationsEnabled: false },
      });
    });

    it('can clear an owner email and turn off notifications', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 7 });
      prismaMock.user.update.mockResolvedValue({ id: 7 });

      await service.update(7, { email: null, dashboardUsername: null });

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: {
          email: null,
          emailNotificationsEnabled: false,
          dashboardAccountId: null,
        },
      });
    });

    it('โยน 404 ก่อน ไม่เรียก update ถ้าไม่มีผู้ใช้', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.update(99, { name: 'x' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('ลบผู้ใช้ที่มีอยู่จริงได้', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 1 });
      prismaMock.user.delete.mockResolvedValue({ id: 1 });

      await expect(service.remove(1)).resolves.toEqual({
        deleted: true,
        id: 1,
      });
    });
  });

  describe('findLogs', () => {
    it('เติม userName ให้ทุกแถว ไม่ปล่อยให้ตารางขึ้นว่า "ไม่รู้จัก"', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        name: 'ธีรภัทร',
        isActive: true,
      });
      prismaMock.accessLog.findMany.mockResolvedValue([
        {
          id: 9,
          uid: 'BEEF0001',
          direction: 'in',
          status: 'granted',
          imagePath: null,
          createdAt: new Date('2026-07-19T12:00:00.000Z'),
        },
      ]);

      const result = await service.findLogs(1);

      expect(result[0].userName).toBe('ธีรภัทร');
      expect(result[0].createdAt).toBe('2026-07-19T12:00:00.000Z');
    });
  });

  describe('findUnassignedUids', () => {
    it('รวมจำนวนครั้งและเวลาที่เห็นล่าสุด เรียงใหม่ก่อน', async () => {
      prismaMock.accessLog.groupBy.mockResolvedValue([
        {
          uid: 'OLD1',
          _count: { uid: 1 },
          _max: { createdAt: new Date('2026-07-01T00:00:00Z') },
        },
        {
          uid: 'NEW1',
          _count: { uid: 3 },
          _max: { createdAt: new Date('2026-07-19T00:00:00Z') },
        },
      ]);

      prismaMock.user.findMany.mockResolvedValue([]);

      const result = await service.findUnassignedUids();

      expect(result[0].uid).toBe('NEW1');
      expect(result[0].attempts).toBe(3);
      expect(result[1].uid).toBe('OLD1');
    });

    it('ไม่แสดง UID ที่ผูกกับผู้ใช้ไปแล้ว แม้ log เก่าจะมี userId เป็น null', async () => {
      prismaMock.accessLog.groupBy.mockResolvedValue([
        {
          uid: 'TAKEN',
          _count: { uid: 1 },
          _max: { createdAt: new Date('2026-07-19T00:00:00Z') },
        },
        {
          uid: 'FREE',
          _count: { uid: 1 },
          _max: { createdAt: new Date('2026-07-19T00:00:00Z') },
        },
      ]);
      prismaMock.user.findMany.mockResolvedValue([{ uid: 'TAKEN' }]);

      const result = await service.findUnassignedUids();

      expect(result.map((row) => row.uid)).toEqual(['FREE']);
    });
  });
});
