import { BackendError } from "@/components/shared/BackendError";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { serverApi } from "@/services/server-api";
import type { AccessAttempt, AccessStats } from "@/types";

/**
 * Server Component — ดึงข้อมูลตั้งต้นด้วย token ฝั่งเซิร์ฟเวอร์
 * แล้วส่งต่อให้ client component ที่ดูแลการอัปเดตเรียลไทม์
 *
 * หมายเหตุ: ต้องไม่สร้าง JSX ใน try/catch (React จะ render ทีหลัง
 * error จึงไม่ถูกจับ) จึงรับผลลัพธ์ออกมาก่อนแล้วค่อยตัดสินใจว่าจะ render อะไร
 */
export default async function DashboardPage() {
  let data: { logs: AccessAttempt[]; stats: AccessStats } | null = null;
  let error: string | null = null;

  try {
    const [logs, stats] = await Promise.all([
      serverApi.recentLogs(),
      serverApi.stats(),
    ]);
    data = { logs, stats };
  } catch (err) {
    error = err instanceof Error ? err.message : "ไม่ทราบสาเหตุ";
  }

  if (data === null) {
    return <BackendError message={error ?? "ไม่ทราบสาเหตุ"} />;
  }

  return <DashboardClient initialLogs={data.logs} initialStats={data.stats} />;
}
