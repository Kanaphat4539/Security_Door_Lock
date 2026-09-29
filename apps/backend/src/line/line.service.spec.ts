import { Test, TestingModule } from '@nestjs/testing';

import type { AccessAttempt } from '../access/access.types';
import { DEFAULT_LINE_ICONS, LineService } from './line.service';

describe('LineService', () => {
  let service: LineService;
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    const module: TestingModule = await Test.createTestingModule({
      providers: [LineService],
    }).compile();

    service = module.get<LineService>(LineService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('buildFlexMessage', () => {
    it('ควรสร้าง Flex message สำหรับสถานะ granted (สีเขียว + อนุญาตให้ผ่านประตู) ได้ถูกต้อง', () => {
      const attempt: AccessAttempt = {
        id: 1,
        uid: 'A9620207',
        userName: 'Aniwat',
        direction: 'in',
        status: 'granted',
        imagePath: null,
        createdAt: '2026-09-30T02:18:34.000Z',
      };

      const result = service.buildFlexMessage(attempt);
      expect(result.type).toBe('flex');
      expect(result.altText).toContain('GRANTED');
      expect(result.altText).toContain('Aniwat');
      expect(result.altText).toContain('ขาเข้า (Entry)');

      const contents = result.contents as any;
      expect(contents.type).toBe('bubble');
      expect(contents.header.backgroundColor).toBe('#20B561');

      // ตรวจสอบหัวเรื่อง
      const headerContents = contents.header.contents;
      expect(headerContents[0].contents[0].text).toBe('SECURITY DOOR LOCK');
      expect(headerContents[0].contents[1].text).toBe('GRANTED');
      expect(headerContents[1].contents[0].text).toBe('อนุญาตให้ผ่านประตู');
      expect(headerContents[1].contents[1].contents[0].text).toBe('✓');

      // ตรวจสอบ body ข้อมูล 4 แถว
      const bodyContents = contents.body.contents;
      expect(bodyContents).toHaveLength(4);

      // 1. ผู้ใช้งาน
      expect(bodyContents[0].contents[0].url).toBe(DEFAULT_LINE_ICONS.user);
      expect(bodyContents[0].contents[1].contents[0].text).toBe('ผู้ใช้งาน');
      expect(bodyContents[0].contents[1].contents[1].text).toBe('Aniwat');

      // 2. รหัส UID
      expect(bodyContents[1].contents[0].url).toBe(DEFAULT_LINE_ICONS.uid);
      expect(bodyContents[1].contents[1].contents[0].text).toBe('รหัส UID');
      expect(bodyContents[1].contents[1].contents[1].text).toBe('A9620207');

      // 3. ทิศทาง
      expect(bodyContents[2].contents[0].url).toBe(DEFAULT_LINE_ICONS.entry);
      expect(bodyContents[2].contents[1].contents[0].text).toBe('ทิศทาง');
      expect(bodyContents[2].contents[1].contents[1].text).toBe('ขาเข้า (Entry)');

      // 4. เวลา
      expect(bodyContents[3].contents[0].url).toBe(DEFAULT_LINE_ICONS.clock);
      expect(bodyContents[3].contents[1].contents[0].text).toBe('เวลา');

      // Footer
      expect(contents.footer.backgroundColor).toBe('#ECEFF2');
      expect(contents.footer.contents[0].text).toBe('IoT Smart Door Lock System.');
    });

    it('ควรสร้าง Flex message สำหรับสถานะ denied (สีแดง + ไม่อนุญาตให้เข้า) ได้ถูกต้อง', () => {
      const attempt: AccessAttempt = {
        id: 2,
        uid: 'DEADBEEF',
        userName: null,
        direction: 'out',
        status: 'denied',
        imagePath: null,
        createdAt: '2026-09-29T18:45:55.000Z',
      };

      const result = service.buildFlexMessage(attempt);
      expect(result.altText).toContain('DENIED');
      expect(result.altText).toContain('ไม่พบข้อมูลในระบบ');
      expect(result.altText).toContain('ขาออก (Exit)');

      const contents = result.contents as any;
      expect(contents.header.backgroundColor).toBe('#DA4034');

      const headerContents = contents.header.contents;
      expect(headerContents[0].contents[1].text).toBe('DENIED');
      expect(headerContents[1].contents[0].text).toBe('ไม่อนุญาตให้เข้า');
      expect(headerContents[1].contents[1].contents[0].text).toBe('✕');

      const bodyContents = contents.body.contents;
      // ผู้ใช้งาน เมื่อไม่มี userName ต้องแสดง "ไม่พบข้อมูลในระบบ"
      expect(bodyContents[0].contents[1].contents[1].text).toBe('ไม่พบข้อมูลในระบบ');
      expect(bodyContents[1].contents[1].contents[1].text).toBe('DEADBEEF');
      expect(bodyContents[2].contents[0].url).toBe(DEFAULT_LINE_ICONS.exit);
      expect(bodyContents[2].contents[1].contents[1].text).toBe('ขาออก (Exit)');
    });

    it('ควรรองรับการ override LINE_ICON_BASE_URL ผ่าน Environment Variable', () => {
      process.env.LINE_ICON_BASE_URL = 'https://my-cdn.example.com/icons';

      const icons = service.getIcons();
      expect(icons.user).toBe('https://my-cdn.example.com/icons/user.png');
      expect(icons.uid).toBe('https://my-cdn.example.com/icons/uid.png');
      expect(icons.entry).toBe('https://my-cdn.example.com/icons/entry.png');
      expect(icons.exit).toBe('https://my-cdn.example.com/icons/exit.png');
      expect(icons.clock).toBe('https://my-cdn.example.com/icons/clock.png');
    });
  });

  describe('notifyAccess', () => {
    it('ถ้าไม่มี LINE_CHANNEL_ACCESS_TOKEN จะไม่พยายามส่งข้อความ', async () => {
      delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
      const sendSpy = jest.spyOn(service, 'sendMessage');

      const attempt: AccessAttempt = {
        id: 1,
        uid: 'TEST1234',
        userName: 'Tester',
        direction: 'in',
        status: 'granted',
        imagePath: null,
        createdAt: '2026-09-30T00:00:00.000Z',
      };

      await service.notifyAccess(attempt);
      expect(sendSpy).not.toHaveBeenCalled();
    });
  });
});
