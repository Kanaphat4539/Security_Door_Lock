"use server";

import { redirect } from "next/navigation";

import { clearSessionCookie, setSessionCookie } from "@/lib/session";

const BACKEND = process.env.NEST_API_URL ?? "http://localhost:3001";

export interface AuthState {
  error: string | null;
}

interface TokenResponse {
  token: string;
  expiresIn: number;
}

/** ยิงไป Nest แล้วเก็บ session ลง cookie — ใช้ร่วมกันทั้ง login และ register */
async function authenticate(
  path: "/auth/login" | "/auth/register",
  body: Record<string, string>,
): Promise<AuthState> {
  let res: Response;
  try {
    res = await fetch(`${BACKEND}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { error: "เชื่อมต่อ backend ไม่ได้ — รันเซิร์ฟเวอร์แล้วหรือยัง" };
  }

  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = detail?.message;
    return {
      error: Array.isArray(message)
        ? message.join(", ")
        : (message ?? "ทำรายการไม่สำเร็จ"),
    };
  }

  const { token, expiresIn } = (await res.json()) as TokenResponse;
  await setSessionCookie(token, expiresIn);
  return { error: null };
}

/**
 * Server Action — รหัสผ่านถูกส่งจากฟอร์มมาที่เซิร์ฟเวอร์ Next โดยตรง
 * แล้วส่งต่อไป Nest ตรวจ ไม่มี JS ฝั่ง client แตะรหัสผ่านเลย
 */
export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (username === "" || password === "") {
    return { error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" };
  }

  const result = await authenticate("/auth/login", { username, password });
  if (result.error !== null) return result;

  // redirect ต้องอยู่นอก try/catch เพราะทำงานด้วยการโยน error ภายใน
  redirect("/");
}

/**
 * สมัครบัญชีใหม่ — ต้องมีรหัสเชิญที่ตรงกับ ADMIN_INVITE_CODE ฝั่ง backend
 * บัญชีที่สมัครเองได้ role USER เสมอ (ดูหน้าภาพรวมได้อย่างเดียว)
 */
export async function register(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const inviteCode = String(formData.get("inviteCode") ?? "");

  if (username === "" || password === "" || inviteCode === "") {
    return { error: "กรุณากรอกข้อมูลให้ครบทุกช่อง" };
  }

  // เช็คฝั่งนี้ก่อนเพื่อบอกผู้ใช้ได้เร็ว ๆ — ฝั่ง backend ตรวจความยาว/รูปแบบซ้ำอีกที
  if (password !== confirmPassword) {
    return { error: "รหัสผ่านทั้งสองช่องไม่ตรงกัน" };
  }

  if (password.length < 8) {
    return { error: "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร" };
  }

  const result = await authenticate("/auth/register", {
    username,
    password,
    inviteCode,
  });
  if (result.error !== null) return result;

  redirect("/");
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
