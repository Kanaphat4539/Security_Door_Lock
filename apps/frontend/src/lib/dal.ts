import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { getSessionToken } from "./session";
import type { Role } from "@/types";

const BACKEND = process.env.NEST_API_URL ?? "http://localhost:3001";

/**
 * Data Access Layer — ด่านตรวจจริงของการเข้าถึงข้อมูล
 *
 * เอกสาร Next บอกชัดว่า proxy.ts (เดิมชื่อ middleware) เหมาะกับการเช็คแบบ
 * optimistic เท่านั้น ไม่ควรใช้เป็นระบบ authorization หลัก
 * การตรวจจริงจึงอยู่ตรงนี้ ติดกับจุดที่ดึงข้อมูลจริง ๆ
 *
 * cache() ทำให้เรียกซ้ำในหนึ่ง render ไม่ต้องอ่าน cookie / ยิง /auth/me ใหม่
 */
export const requireSession = cache(async (): Promise<string> => {
  const token = await getSessionToken();

  if (token === null) {
    redirect("/login");
  }

  return token;
});

/**
 * ดึง role ของคนที่ล็อกอินอยู่จาก backend
 *
 * ตั้งใจไม่ decode JWT เองฝั่ง Next เพราะจะต้องแชร์ JWT_SECRET มาไว้ที่นี่ด้วย
 * ให้ Nest เป็นเจ้าของความจริงเรื่องสิทธิ์ที่เดียวดีกว่า
 */
export const getCurrentRole = cache(async (): Promise<Role> => {
  const token = await requireSession();

  const res = await fetch(`${BACKEND}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (res.status === 401) {
    // session หมดอายุระหว่างทาง
    redirect("/login");
  }

  if (!res.ok) {
    throw new Error(`/auth/me ตอบกลับ HTTP ${res.status}`);
  }

  const { role } = (await res.json()) as { role: Role };
  return role;
});

/**
 * ใช้กับหน้าที่ต้องเป็น ADMIN เท่านั้น
 *
 * ⚠️ นี่เป็นการกันที่ชั้น UI เพื่อไม่ให้ผู้ใช้เห็นหน้าที่กดอะไรไม่ได้
 * ด่านจริงอยู่ที่ backend (@AdminOnly) ซึ่งตอบ 403 ไม่ว่าจะเรียกมาจากไหน
 */
export const requireAdmin = cache(async (): Promise<void> => {
  const role = await getCurrentRole();
  if (role !== "ADMIN") {
    redirect("/");
  }
});
