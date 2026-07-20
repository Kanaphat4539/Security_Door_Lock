// Prisma client ที่ generate ออกมาเป็นซอร์ส .ts ที่ import กันเองด้วยนามสกุล .js
// (เช่น './internal/class.js') ซึ่ง tsc แปลงให้ได้ แต่ jest resolve ไม่ได้
// เทสต์นี้ใช้ PrismaService แค่เป็น DI token ไม่ได้สร้างอินสแตนซ์จริง
// จึง stub ตัว client ทิ้งไปเพื่อไม่ให้โมดูลจริงถูกโหลด
jest.mock('../../generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';

import { EventsGateway } from '../events/events.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from './access.service';

// mock Prisma แทนการต่อ DB จริง เพื่อให้ `npm test` รันได้โดยไม่ต้องมี MySQL
const prismaMock = {
  user: { findUnique: jest.fn() },
  accessLog: { create: jest.fn(), findMany: jest.fn() },
};

const eventsMock = { emitAccess: jest.fn() };

const fakeLog = (over: Record<string, unknown> = {}) => ({
  id: 1,
  uid: 'A1B2C3D4',
  direction: 'in',
  status: 'granted',
  imagePath: null,
  userId: 1,
  createdAt: new Date('2026-07-19T12:00:00.000Z'),
  ...over,
});

describe('AccessService', () => {
  let service: AccessService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EventsGateway, useValue: eventsMock },
      ],
    }).compile();

    service = module.get<AccessService>(AccessService);
  });

  describe('authorize', () => {
    it('granted เมื่อพบบัตรและบัตรเปิดใช้งานอยู่', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        name: 'ธีรภัทร',
        isActive: true,
      });
      prismaMock.accessLog.create.mockResolvedValue(fakeLog());

      const result = await service.authorize('A1B2C3D4', 'in', null);

      expect(result.status).toBe('granted');
      expect(result.userName).toBe('ธีรภัทร');
    });

    it('denied เมื่อไม่พบบัตร และบันทึก log ด้วย userId = null', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.accessLog.create.mockResolvedValue(
        fakeLog({ uid: 'DEADBEEF', status: 'denied', userId: null }),
      );

      const result = await service.authorize('DEADBEEF', 'in', null);

      expect(result.status).toBe('denied');
      expect(result.userName).toBeNull();
      expect(prismaMock.accessLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'denied', userId: null }),
        }),
      );
    });

    it('denied เมื่อพบบัตรแต่ถูกปิดใช้งาน (isActive = false)', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 2,
        name: 'บัตรเก่า',
        isActive: false,
      });
      prismaMock.accessLog.create.mockResolvedValue(
        fakeLog({ status: 'denied', userId: 2 }),
      );

      const result = await service.authorize('A1B2C3D4', 'out', null);

      expect(result.status).toBe('denied');
    });

    it('normalize uid เป็นตัวพิมพ์ใหญ่ก่อนค้นหา', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.accessLog.create.mockResolvedValue(
        fakeLog({ status: 'denied', userId: null }),
      );

      await service.authorize('  a1b2c3d4 ', 'in', null);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { uid: 'A1B2C3D4' },
      });
    });

    it('เก็บ imagePath ที่ส่งเข้ามาลง log', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.accessLog.create.mockResolvedValue(
        fakeLog({ status: 'denied', userId: null, imagePath: 'uploads/a.jpg' }),
      );

      await service.authorize('DEADBEEF', 'in', 'uploads/a.jpg');

      expect(prismaMock.accessLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ imagePath: 'uploads/a.jpg' }),
        }),
      );
    });
  });

  describe('การยิง WebSocket event', () => {
    it('ยิง event ทั้งกรณี granted และ denied', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.accessLog.create.mockResolvedValue(
        fakeLog({ uid: 'DEADBEEF', status: 'denied', userId: null }),
      );

      await service.authorize('DEADBEEF', 'in', null);

      expect(eventsMock.emitAccess).toHaveBeenCalledTimes(1);
      expect(eventsMock.emitAccess).toHaveBeenCalledWith(
        expect.objectContaining({ uid: 'DEADBEEF', status: 'denied' }),
      );
    });

    it('payload ที่ยิงออกไปเป็นตัวเดียวกับที่ตอบกลับ controller', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        name: 'ธีรภัทร',
        isActive: true,
      });
      prismaMock.accessLog.create.mockResolvedValue(fakeLog());

      const returned = await service.authorize('A1B2C3D4', 'in', null);

      expect(eventsMock.emitAccess).toHaveBeenCalledWith(returned);
    });
  });

  describe('getRecent', () => {
    it('คืน log เรียงใหม่ก่อน พร้อมชื่อผู้ใช้', async () => {
      prismaMock.accessLog.findMany.mockResolvedValue([
        { ...fakeLog(), user: { name: 'ธีรภัทร' } },
        { ...fakeLog({ id: 2, userId: null }), user: null },
      ]);

      const result = await service.getRecent();

      expect(result).toHaveLength(2);
      expect(result[0].userName).toBe('ธีรภัทร');
      expect(result[1].userName).toBeNull();
      expect(prismaMock.accessLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' }, take: 50 }),
      );
    });
  });
});
