// เรียกผ่าน proxy ที่ /api/... เสมอ ไม่เรียก Nest ตรง ๆ จากเบราว์เซอร์
// (proxy เป็นคนแนบ token ให้ ดู src/app/api/[...path]/route.ts)

import type {
  AccessAttempt,
  AccessStats,
  UnassignedUid,
  User,
} from "@/types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    // backend ตอบ error เป็น { message } — ถ้า parse ไม่ได้ก็ใช้ status แทน
    const detail = await res.json().catch(() => null);
    const message = detail?.message ?? `HTTP ${res.status}`;
    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }

  return res.json() as Promise<T>;
}

export const api = {
  recentLogs: () => request<AccessAttempt[]>("/access/recent"),
  stats: () => request<AccessStats>("/access/stats"),

  users: () => request<User[]>("/users"),
  userLogs: (id: number) => request<AccessAttempt[]>(`/users/${id}/logs`),
  unassignedUids: () => request<UnassignedUid[]>("/users/unassigned-uids"),

  createUser: (data: { uid: string; name: string }) =>
    request<User>("/users", { method: "POST", body: JSON.stringify(data) }),

  updateUser: (id: number, data: { name?: string; isActive?: boolean }) =>
    request<User>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteUser: (id: number) =>
    request<{ deleted: boolean }>(`/users/${id}`, { method: "DELETE" }),
};

/** path ของภาพที่ backend เก็บไว้ (เช่น "uploads/xxx.jpg") -> URL ผ่าน proxy */
export function imageUrl(imagePath: string): string {
  const filename = imagePath.split("/").pop() ?? "";
  return `/api/access/image/${filename}`;
}
