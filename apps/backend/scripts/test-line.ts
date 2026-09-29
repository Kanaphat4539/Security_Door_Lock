import 'dotenv/config';

import type { AccessAttempt } from '../src/access/access.types';
import { LineService } from '../src/line/line.service';

async function main() {
  const lineService = new LineService();

  console.log('🚀 กำลังส่งข้อความทดสอบ LINE Flex Message...');

  // กรณีที่ 1: GRANTED (อนุญาตให้ผ่านประตู)
  console.log('\n[1/2] ส่งกรณี GRANTED (อนุญาตให้ผ่านประตู - ขาเข้า)...');
  const grantedAttempt: AccessAttempt = {
    id: 991,
    uid: 'A9620207',
    userName: 'Aniwat',
    direction: 'in',
    status: 'granted',
    imagePath: null,
    createdAt: new Date().toISOString(),
  };

  const flexGranted = lineService.buildFlexMessage(grantedAttempt);
  const ok1 = await lineService.sendMessage(flexGranted);
  console.log(`สถานะการส่งกรณี GRANTED: ${ok1 ? 'สำเร็จ ✅' : 'ไม่สำเร็จ ❌'}`);

  // เว้นช่วง 1 วินาที
  await new Promise((r) => setTimeout(r, 1200));

  // กรณีที่ 2: DENIED (ไม่อนุญาตให้เข้า)
  console.log('\n[2/2] ส่งกรณี DENIED (ไม่อนุญาตให้เข้า - ขาออก)...');
  const deniedAttempt: AccessAttempt = {
    id: 992,
    uid: 'DEADBEEF',
    userName: null,
    direction: 'out',
    status: 'denied',
    imagePath: null,
    createdAt: new Date().toISOString(),
  };

  const flexDenied = lineService.buildFlexMessage(deniedAttempt);
  const ok2 = await lineService.sendMessage(flexDenied);
  console.log(`สถานะการส่งกรณี DENIED: ${ok2 ? 'สำเร็จ ✅' : 'ไม่สำเร็จ ❌'}`);
}

main().catch((err) => {
  console.error('Error running test-line:', err);
  process.exit(1);
});
