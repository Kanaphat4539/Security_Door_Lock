// ชื่อ field ต้องตรงกับฝั่ง firmware (firmware/src/shared/protocol.h)
// และฝั่ง frontend — ดู CLAUDE.md หัวข้อ "การตั้งชื่อ field ข้อมูล"
//
// ค่าเหล่านี้ตรงกับ enum Direction / AccessStatus ใน prisma/schema.prisma
// (Prisma generate ออกมาเป็น string literal ตัวพิมพ์เล็กเหมือนกันเป๊ะ)

export type Direction = 'in' | 'out';
export type AccessStatus = 'granted' | 'denied';

export interface AccessResponse {
  status: AccessStatus;
}

export interface AccessAttempt {
  id: number;
  uid: string;
  direction: Direction;
  status: AccessStatus;
  imagePath: string | null;
  /** ชื่อผู้ใช้ ถ้าบัตรใบนั้นไม่มีในระบบจะเป็น null */
  userName: string | null;
  createdAt: string;
}

export function isDirection(value: unknown): value is Direction {
  return value === 'in' || value === 'out';
}
