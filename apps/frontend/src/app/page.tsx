import { BackendError } from "@/components/shared/BackendError";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getCurrentRole } from "@/lib/dal";
import { serverApi } from "@/services/server-api";
import type { AccessAttempt, AccessStats, Role } from "@/types";

/**
 * Server Component — ดึงข้อมูลตั้งต้นด้วย token ฝั่งเซิร์ฟเวอร์
 * แล้วส่งต่อให้ client component ที่ดูแลการอัปเดตเรียลไทม์
 *
 * หมายเหตุ: ต้องไม่สร้าง JSX ใน try/catch (React จะ render ทีหลัง
 * error จึงไม่ถูกจับ) จึงรับผลลัพธ์ออกมาก่อนแล้วค่อยตัดสินใจว่าจะ render อะไร
 */
export default async function DashboardPage() {
  let data: { logs: AccessAttempt[]; stats: AccessStats; role: Role } | null = null;
  let error: string | null = null;

  try {
    const [logs, stats, role] = await Promise.all([
      serverApi.recentLogs(),
      serverApi.stats(),
      getCurrentRole(),
    ]);
    data = { logs, stats, role };
  } catch (err) {
    error = err instanceof Error ? err.message : "ไม่ทราบสาเหตุ";
  }

  if (data === null) {
    return <BackendError message={error ?? "ไม่ทราบสาเหตุ"} />;
  }

  return <DashboardClient initialLogs={data.logs} initialStats={data.stats} role={data.role} />;
}
