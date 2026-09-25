// ต้องตรงกับ backend/src/access/access.types.ts และ prisma/schema.prisma
// ค่าตัวพิมพ์เล็กเหมือนกันทั้งสามฝั่ง (firmware / backend / frontend)

export type Direction = "in" | "out";
export type AccessStatus = "granted" | "denied";

/** สิทธิ์ของบัญชี dashboard — ตรงกับ enum Role ใน prisma/schema.prisma */
export type Role = "ADMIN" | "USER";

export interface AccessAttempt {
  id: number;
  uid: string;
  direction: Direction;
  status: AccessStatus;
  imagePath: string | null;
  userName: string | null;
  createdAt: string;
}

export interface AccessStats {
  entriesToday: number;
  deniedToday: number;
  totalUsers: number;
  activeUsers: number;
}

export interface User {
  id: number;
  uid: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { logs: number };
}

export interface UnassignedUid {
  uid: string;
  attempts: number;
  lastSeenAt: string | null;
}

/** ชื่อ event ต้องตรงกับ WS_EVENTS ใน backend/src/events/events.types.ts */
export const WS_EVENT_ACCESS = "access";
