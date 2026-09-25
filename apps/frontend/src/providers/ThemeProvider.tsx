"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * shadcn เปลี่ยนโหมดมืดมาใช้คลาส .dark (ดู @custom-variant ใน globals.css)
 * ไม่ใช่ prefers-color-scheme แบบเดิม จึงต้องมีคนคอยใส่คลาสให้ <html>
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
