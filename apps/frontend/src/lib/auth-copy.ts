export function getAuthPresentation(tab: "login" | "register") {
  return tab === "login"
    ? {
        title: "ยินดีต้อนรับกลับ",
        description: "เข้าสู่ระบบเพื่อติดตามการเข้า-ออกและจัดการบัตร",
      }
    : {
        title: "สร้างบัญชีผู้ชม",
        description: "บัญชีผู้ชมลงทะเบียนด้วยรหัสเชิญจากผู้ดูแล เพื่อดูภาพรวมแบบอ่านอย่างเดียว",
      };
}
