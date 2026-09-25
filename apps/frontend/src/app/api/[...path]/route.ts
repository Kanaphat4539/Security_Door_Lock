import { getSessionToken } from "@/lib/session";

/**
 * Proxy ไปยัง Nest backend สำหรับ request ที่มาจากฝั่ง client
 *
 * ใช้ session token ของ admin ที่ล็อกอิน (อ่านจาก cookie httpOnly)
 * ไม่ใช่ static token — ถ้าไม่มี session ตอบ 401 ไปเลย
 *
 * ผลพลอยได้: <img src="/api/access/image/xxx.jpg"> ใช้ได้
 * เพราะเบราว์เซอร์แนบ cookie ให้อัตโนมัติ ส่วน header Authorization
 * แท็ก img แนบเองไม่ได้ route นี้เลยเป็นคนแนบให้แทน
 *
 * หมายเหตุ: params เป็น Promise ใน Next.js เวอร์ชันนี้ ต้อง await ก่อนใช้
 */
const BACKEND = process.env.NEST_API_URL ?? "http://localhost:3001";

type Ctx = { params: Promise<{ path: string[] }> };

async function forward(request: Request, ctx: Ctx): Promise<Response> {
  const token = await getSessionToken();
  if (token === null) {
    return Response.json({ message: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  }

  const { path } = await ctx.params;
  const search = new URL(request.url).search;
  const target = `${BACKEND}/${path.join("/")}${search}`;

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);

  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const method = request.method;
  const body =
    method === "GET" || method === "HEAD" ? undefined : await request.text();

  const upstream = await fetch(target, { method, headers, body });

  // ส่งต่อทั้ง body และ content-type ตรง ๆ เพื่อให้ไฟล์ภาพผ่านได้ด้วย
  const responseHeaders = new Headers();
  const upstreamType = upstream.headers.get("content-type");
  if (upstreamType) responseHeaders.set("content-type", upstreamType);

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const PUT = forward;
export const DELETE = forward;
