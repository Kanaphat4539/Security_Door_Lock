import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/session";

/**
 * Next.js 16 เปลี่ยนชื่อ Middleware เป็น "Proxy" แล้ว (ไฟล์ต้องชื่อ proxy.ts)
 * ความสามารถเหมือนเดิมทุกอย่าง
 *
 * ⚠️ ตรงนี้เป็นแค่การเช็คแบบ optimistic เพื่อพาไปหน้า login เร็ว ๆ เท่านั้น
 * เอกสาร Next ระบุชัดว่าห้ามใช้ proxy เป็นระบบ authorization หลัก
 * ด่านจริงอยู่ที่ requireSession() ใน lib/dal.ts และที่ Nest ตรวจ JWT อีกชั้น
 * (ตรงนี้ดูแค่ว่า "มี cookie ไหม" ไม่ได้ตรวจว่า JWT ยังไม่หมดอายุ)
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isLoginPage = request.nextUrl.pathname === "/login";

  if (!hasSession && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSession && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // ข้าม /api (route handler ตรวจ session เองแล้ว ตอบ 401 ดีกว่า redirect)
  // และข้ามไฟล์ static ของ Next
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
