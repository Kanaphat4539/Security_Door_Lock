"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

/**
 * ธีมจริงรู้ได้เฉพาะฝั่ง client จะเอา resolvedTheme มาเลือกไอคอนตอน render ไม่ได้
 * (ฝั่ง server ไม่รู้ค่า -> hydration ไม่ตรง) และจะใช้ useEffect+setState ก็ไม่ได้
 * เพราะ react-hooks/set-state-in-effect เป็น error ใน React 19
 *
 * ทางออก: render ไอคอนทั้งสองอันไปเลย แล้วให้ CSS เลือกว่าจะโชว์อันไหน
 * ตามคลาส .dark ที่ next-themes ใส่ไว้ที่ <html> — ไม่ต้องมี state เลย
 * ส่วน resolvedTheme อ่านใน onClick ได้ตามปกติ (ไม่ใช่ตอน render)
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="สลับโหมดสว่าง/มืด"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Moon className="dark:hidden" />
      <Sun className="hidden dark:block" />
    </Button>
  );
}
