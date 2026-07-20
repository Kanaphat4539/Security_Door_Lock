import { SetMetadata } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

export const IS_PUBLIC = 'auth:isPublic';
export const IS_DEVICE_ROUTE = 'auth:isDeviceRoute';
export const IS_ADMIN_ONLY = 'auth:isAdminOnly';

/** guard แปะ id/role ของ admin ไว้บน request หลังตรวจ session token ผ่าน */
export const SESSION_ADMIN_ID = 'authAdminId';
export const SESSION_ROLE = 'authRole';

/**
 * route ที่ต้องเป็น role ADMIN เท่านั้น
 *
 * บัญชี role USER ที่ล็อกอินอยู่จะโดน 403
 * ส่วน DASHBOARD_TOKEN (static) ยังผ่านได้ เพราะเป็น credential ของเครื่องมือ
 * ฝั่งเซิร์ฟเวอร์/สคริปต์ ไม่ได้ผูกกับบัญชีคน
 */
export const AdminOnly = () => SetMetadata(IS_ADMIN_ONLY, true);

/** ไม่ต้องมี token เลย (ใช้กับ health check) */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/**
 * route ที่ ESP32-CAM เรียก — รับได้ทั้ง DEVICE_TOKEN และ DASHBOARD_TOKEN
 * route อื่น ๆ ที่ไม่ได้ติด decorator นี้ จะรับเฉพาะ DASHBOARD_TOKEN
 */
export const DeviceRoute = () => SetMetadata(IS_DEVICE_ROUTE, true);

/**
 * เทียบ token แบบ timing-safe กันการเดาทีละไบต์จากเวลาที่ใช้ตอบ
 * ต้องเช็คความยาวก่อน เพราะ timingSafeEqual โยน error ถ้าความยาวไม่เท่ากัน
 */
export function tokenMatches(provided: string, expected: string): boolean {
  if (expected.length === 0) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

/** ดึง token จาก header "Authorization: Bearer <token>" */
export function extractBearer(header: unknown): string | null {
  if (typeof header !== 'string') return null;
  const [scheme, value] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) return null;
  return value;
}
