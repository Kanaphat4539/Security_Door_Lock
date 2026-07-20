import { getSessionToken } from "@/lib/session";

/**
 * แลก session -> ตั๋วอายุสั้นสำหรับต่อ WebSocket
 *
 * ก่อนหน้านี้ route นี้ (ชื่อเดิม /api/realtime-token) ส่ง DASHBOARD_TOKEN
 * ตัวจริงให้เบราว์เซอร์ ซึ่งแปลว่าใครเปิดหน้าเว็บได้ก็ได้ token ที่เรียก REST
 * ได้ทุก route และไม่มีวันหมดอายุ
 *
 * ตอนนี้ต้องล็อกอินก่อน แล้วได้แค่ตั๋วที่:
 *   - ใช้ต่อ WebSocket ได้อย่างเดียว (typ: 'ws' ฝั่ง Nest ตรวจ)
 *   - หมดอายุใน 60 วินาที
 *
 * เส้นทางนี้เป็น static segment จึงชนะ [...path] ที่เป็น dynamic
 */
const BACKEND = process.env.NEST_API_URL ?? "http://localhost:3001";

export async function GET(): Promise<Response> {
  const token = await getSessionToken();
  if (token === null) {
    return Response.json({ message: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  }

  const upstream = await fetch(`${BACKEND}/auth/ws-ticket`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!upstream.ok) {
    return Response.json(
      { message: "ขอตั๋ว WebSocket ไม่สำเร็จ" },
      { status: upstream.status },
    );
  }

  const { ticket, expiresIn } = (await upstream.json()) as {
    ticket: string;
    expiresIn: number;
  };

  return Response.json({
    url: process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001",
    ticket,
    expiresIn,
  });
}
