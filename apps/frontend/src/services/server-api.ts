import "server-only";

import { requireSession } from "@/lib/dal";
import type { AccessAttempt, AccessStats, UnassignedUid, User } from "@/types";

/**
 * ดึงข้อมูลจากฝั่งเซิร์ฟเวอร์ของ Next (Server Component)
 *
 * ใช้ session token ของ admin ที่ล็อกอิน ไม่ใช่ static token
 * -> ถ้าไม่ได้ล็อกอิน requireSession() จะ redirect ไป /login ให้เอง
 */
const BACKEND = process.env.NEST_API_URL ?? "http://localhost:3001";

async function get<T>(path: string): Promise<T> {
  const token = await requireSession();

  const res = await fetch(`${BACKEND}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    // ข้อมูลเข้า-ออกต้องสดเสมอ ห้าม cache
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`${path} ตอบกลับ HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const serverApi = {
  recentLogs: () => get<AccessAttempt[]>("/access/recent"),
  stats: () => get<AccessStats>("/access/stats"),
  users: () => get<User[]>("/users"),
  unassignedUids: () => get<UnassignedUid[]>("/users/unassigned-uids"),
};
