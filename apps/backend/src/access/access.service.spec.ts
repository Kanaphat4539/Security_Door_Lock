// Prisma client ที่ generate ออกมาเป็นซอร์ส .ts ที่ import กันเองด้วยนามสกุล .js
// (เช่น './internal/class.js') ซึ่ง tsc แปลงให้ได้ แต่ jest resolve ไม่ได้
// เทสต์นี้ใช้ PrismaService แค่เป็น DI token ไม่ได้สร้างอินสแตนซ์จริง
// จึง stub ตัว client ทิ้งไปเพื่อไม่ให้โมดูลจริงถูกโหลด
jest.mock('../../generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';

import { ImageFetchService } from '../devices/image-fetch.service';
import { EventsGateway } from '../events/events.gateway';
import { LineService } from '../line/line.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from './access.service';

// mock dependency ทั้งหมด เพื่อให้ `npm test` รันได้โดยไม่ต้องมี MySQL / CAM จริง
const prismaMock = {
  user: { findUnique: jest.fn() },
  accessLog: { create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  emailNotification: { create: jest.fn() },
};
const eventsMock = { emitAccess: jest.fn() };
const imageFetchMock = { fetchFromCam: jest.fn() };
const lineMock = { notifyAccess: jest.fn() };

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

// ปล่อยให้งาน async แบบ fire-and-forget (ดึงรูปตอนขาเข้า) ทำงานจนจบก่อน assert
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('AccessService', () => {
  let service: AccessService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EventsGateway, useValue: eventsMock },
        { provide: ImageFetchService, useValue: imageFetchMock },
        { provide: LineService, useValue: lineMock },
      ],
    }).compile();

    service = module.get<AccessService>(AccessService);
  });

  describe('authorize', () => {
    it('records the card owner name at scan time', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 1, name: 'Original Name', isActive: true, emailNotificationsEnabled: false });
      prismaMock.accessLog.create.mockResolvedValue(fakeLog());

      await service.authorize('A1B2C3D4', 'in');

      expect(prismaMock.accessLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userName: 'Original Name' }),
      });
    });

    it('still grants access when the email outbox write fails', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 1, name: 'Owner', isActive: true, email: 'owner@example.com', emailNotificationsEnabled: true });
      prismaMock.accessLog.create.mockResolvedValue(fakeLog());
      prismaMock.emailNotification.create.mockRejectedValue(new Error('outbox unavailable'));

      await expect(service.authorize('A1B2C3D4', 'in')).resolves.toMatchObject({ status: 'granted' });
    });

    it('does not wait for a slow email outbox before granting access', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 1, name: 'Owner', isActive: true, email: 'owner@example.com', emailNotificationsEnabled: true });
      prismaMock.accessLog.create.mockResolvedValue(fakeLog());
      prismaMock.emailNotification.create.mockReturnValue(new Promise(() => undefined));

      const result = await Promise.race([
        service.authorize('A1B2C3D4', 'in').then(() => 'granted'),
        new Promise<string>((resolve) => setTimeout(() => resolve('blocked'), 25)),
      ]);

      expect(result).toBe('granted');
    });
    it.each(['in', 'out'] as const)(
      'queues one owner email for granted %s access',
      async (direction) => {
        prismaMock.user.findUnique.mockResolvedValue({
          id: 1,
          name: 'Owner',
          isActive: true,
          email: 'owner@example.com',
          emailNotificationsEnabled: true,
        });
        prismaMock.accessLog.create.mockResolvedValue(fakeLog({ direction }));
        prismaMock.emailNotification.create.mockResolvedValue({ id: 4 });

        await service.authorize('A1B2C3D4', direction);

        expect(prismaMock.emailNotification.create).toHaveBeenCalledWith({
          data: {
            accessLogId: 1,
            toEmail: 'owner@example.com',
            recipientName: 'Owner',
          },
        });
      },
    );

    it.each([
      [null, 'in'],
      [
        {
          id: 1,
          name: 'Owner',
          isActive: false,
          email: 'owner@example.com',
          emailNotificationsEnabled: true,
        },
        'out',
      ],
      [
        {
          id: 1,
          name: 'Owner',
          isActive: true,
          email: null,
          emailNotificationsEnabled: true,
        },
        'in',
      ],
      [
        {
          id: 1,
          name: 'Owner',
          isActive: true,
          email: 'owner@example.com',
          emailNotificationsEnabled: false,
        },
        'out',
      ],
    ] as const)(
      'does not queue when owner is unavailable or opted out (%j, %s)',
      async (user, direction) => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.accessLog.create.mockResolvedValue(fakeLog());

        await service.authorize('A1B2C3D4', direction);

        expect(prismaMock.emailNotification.create).not.toHaveBeenCalled();
      },
    );

    it('granted เมื่อพบบัตรและบัตรเปิดใช้งานอยู่', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        name: 'ธีรภัทร',
        isActive: true,
      });
      prismaMock.accessLog.create.mockResolvedValue(fakeLog());

      const result = await service.authorize('A1B2C3D4', 'in');

      expect(result.status).toBe('granted');
      expect(result.userName).toBe('ธีรภัทร');
    });

    it('denied เมื่อไม่พบบัตร และบันทึก log ด้วย userId = null', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.accessLog.create.mockResolvedValue(
        fakeLog({ uid: 'DEADBEEF', status: 'denied', userId: null }),
      );

      const result = await service.authorize('DEADBEEF', 'in');

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

      const result = await service.authorize('A1B2C3D4', 'out');

      expect(result.status).toBe('denied');
    });

    it('normalize uid เป็นตัวพิมพ์ใหญ่ก่อนค้นหา', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.accessLog.create.mockResolvedValue(
        fakeLog({ status: 'denied', userId: null }),
      );

      await service.authorize('  a1b2c3d4 ', 'in');

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { uid: 'A1B2C3D4' },
      });
    });

    it('สร้าง log ด้วย imagePath = null (รูปมาทีหลังตอนขาเข้า)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.accessLog.create.mockResolvedValue(
        fakeLog({ status: 'denied', userId: null }),
      );

      await service.authorize('DEADBEEF', 'in');

      expect(prismaMock.accessLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ imagePath: null }),
        }),
      );
    });
  });

  describe('handleAccess (Design B)', () => {
    it('ขาออก: ตอบ status + ยิง event ทันที ไม่ดึงรูป', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.accessLog.create.mockResolvedValue(
        fakeLog({
          uid: 'DEADBEEF',
          direction: 'out',
          status: 'denied',
          userId: null,
        }),
      );

      const res = await service.handleAccess('DEADBEEF', 'out');

      expect(res.status).toBe('denied');
      expect(imageFetchMock.fetchFromCam).not.toHaveBeenCalled();
      expect(eventsMock.emitAccess).toHaveBeenCalledTimes(1);
      expect(lineMock.notifyAccess).toHaveBeenCalledTimes(1);
    });

    it('ขาเข้า: ตอบ status ทันที แล้วดึงรูป -> อัปเดต log -> ยิง event พร้อมรูป', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        name: 'ธีรภัทร',
        isActive: true,
      });
      prismaMock.accessLog.create.mockResolvedValue(fakeLog());
      prismaMock.accessLog.update.mockResolvedValue({});
      imageFetchMock.fetchFromCam.mockResolvedValue('uploads/x.jpg');

      const res = await service.handleAccess('A1B2C3D4', 'in');
      expect(res.status).toBe('granted');
      expect(lineMock.notifyAccess).toHaveBeenCalledTimes(1);

      await flush();

      expect(imageFetchMock.fetchFromCam).toHaveBeenCalledTimes(1);
      expect(prismaMock.accessLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { imagePath: 'uploads/x.jpg' },
        }),
      );
      expect(eventsMock.emitAccess).toHaveBeenCalledWith(
        expect.objectContaining({ imagePath: 'uploads/x.jpg' }),
      );
    });

    it('ขาเข้า: ถ้าดึงรูปไม่ได้ ยังยิง event (imagePath null) และไม่อัปเดต log', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.accessLog.create.mockResolvedValue(
        fakeLog({ status: 'denied', userId: null }),
      );
      imageFetchMock.fetchFromCam.mockResolvedValue(null);

      await service.handleAccess('DEADBEEF', 'in');
      await flush();

      expect(prismaMock.accessLog.update).not.toHaveBeenCalled();
      expect(eventsMock.emitAccess).toHaveBeenCalledWith(
        expect.objectContaining({ imagePath: null }),
      );
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

  describe('getHistory', () => {
    it('uses the name saved on the scan even after the card owner is removed', async () => {
      prismaMock.accessLog.findMany.mockResolvedValue([
        { ...fakeLog({ id: 4, userName: 'Original Name' }), user: null },
      ]);

      const page = await service.getHistory();

      expect(page.logs[0].userName).toBe('Original Name');
    });
    it('แบ่งหน้าครั้งละ 50 และคืน cursor เมื่อมีข้อมูลถัดไป', async () => {
      prismaMock.accessLog.findMany.mockResolvedValue(
        Array.from({ length: 51 }, (_, index) => ({
          ...fakeLog({ id: 100 - index }),
          user: { name: 'สมชาย' },
        })),
      );

      const page = await service.getHistory(101);

      expect(page.logs).toHaveLength(50);
      expect(page.logs[0].id).toBe(100);
      expect(page.nextCursor).toBe(51);
      expect(prismaMock.accessLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { lt: 101 } },
          orderBy: { id: 'desc' },
          take: 51,
        }),
      );
    });

    it('คืน cursor เป็น null เมื่อถึงหน้าสุดท้าย', async () => {
      prismaMock.accessLog.findMany.mockResolvedValue([
        { ...fakeLog({ id: 3 }), user: null },
      ]);

      const page = await service.getHistory();

      expect(page.logs).toHaveLength(1);
      expect(page.nextCursor).toBeNull();
    });
  });
});
