import type { AccessAttempt } from '../access/access.types';

/**
 * ชื่อ event ที่ฝั่ง frontend ต้อง subscribe ให้ตรงกันเป๊ะ ๆ
 * ใช้ค่าคงที่จากที่นี่ทั้งสองฝั่ง อย่าพิมพ์สตริงเองเพื่อกันพิมพ์ผิด
 */
export const WS_EVENTS = {
  /** มีการทาบบัตร (ทั้ง granted และ denied) */
  ACCESS: 'access',
  /** CAM proximity presence state changed */
  PRESENCE: 'presence',
} as const;

export type AccessEventPayload = AccessAttempt;

export interface PresenceEventPayload {
  present: boolean;
  reportedAt: string;
}
