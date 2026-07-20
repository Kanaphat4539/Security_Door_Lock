import { BackendError } from "@/components/shared/BackendError";
import { UsersClient } from "@/components/dashboard/UsersClient";
import { requireAdmin } from "@/lib/dal";
import { serverApi } from "@/services/server-api";
import type { UnassignedUid, User } from "@/types";

/**
 * Server Component — ดึงรายชื่อด้วย token ฝั่งเซิร์ฟเวอร์
 *
 * requireAdmin() เด้ง role USER กลับหน้าแรก
 * (backend ก็ตอบ 403 อยู่แล้ว อันนี้แค่ไม่ให้เห็นหน้าที่ใช้งานไม่ได้)
 */
export default async function UsersPage() {
  await requireAdmin();

  let data: { users: User[]; unassigned: UnassignedUid[] } | null = null;
  let error: string | null = null;

  try {
    const [users, unassigned] = await Promise.all([
      serverApi.users(),
      serverApi.unassignedUids(),
    ]);
    data = { users, unassigned };
  } catch (err) {
    error = err instanceof Error ? err.message : "ไม่ทราบสาเหตุ";
  }

  if (data === null) {
    return <BackendError message={error ?? "ไม่ทราบสาเหตุ"} />;
  }

  return <UsersClient users={data.users} unassigned={data.unassigned} />;
}
