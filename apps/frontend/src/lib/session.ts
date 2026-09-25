import "server-only";

import { cookies } from "next/headers";

/**
 * session ของ dashboard = JWT ที่ Nest ออกให้ เก็บใน cookie แบบ httpOnly
 *
 * httpOnly สำคัญมาก: JavaScript ในหน้าเว็บอ่าน cookie นี้ไม่ได้เลย
 * ต่อให้มี XSS ก็ขโมย session ออกไปตรง ๆ ไม่ได้
 */
export const SESSION_COOKIE = "doorlock_session";

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function setSessionCookie(
  token: string,
  maxAgeSeconds: number,
): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // ยังเป็น http อยู่ตอน dev — เปิด secure เมื่อไหร่ที่ทำ HTTPS
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
