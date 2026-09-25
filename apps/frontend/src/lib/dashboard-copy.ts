import type { Role } from "@/types";

/** UI copy only; permissions are enforced by the backend and requireAdmin. */
export function getDashboardPresentation(role: Role) {
  return role === "ADMIN"
    ? {
        eyebrow: "SECURITY OPERATIONS / ผู้ดูแลระบบ",
        title: "ศูนย์ควบคุมการเข้า-ออก",
        description: "ตรวจสอบเหตุการณ์จากบัตร RFID และจัดการสิทธิ์ผู้ใช้งานในที่เดียว",
        notice: "ข้อมูลเหตุการณ์มาจาก backend; ยังไม่มีข้อมูลสถานะประตูหรือรีเลย์แบบสด",
        showManagement: true,
      }
    : {
        eyebrow: "ACTIVITY OVERVIEW / ผู้ชม",
        title: "ภาพรวมการเข้า-ออก",
        description: "ติดตามภาพรวมการใช้งานและเหตุการณ์ล่าสุดแบบอ่านอย่างเดียว",
        notice: "ประวัติที่แสดงเป็นของทุกคนในระบบ ไม่ใช่ประวัติส่วนตัวของบัญชีนี้",
        showManagement: false,
      };
}
