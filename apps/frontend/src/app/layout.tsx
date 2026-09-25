import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import { DoorClosed, LogOut, Radio } from "lucide-react";

import { logout } from "@/app/login/actions";
import { MainNav } from "@/components/shared/MainNav";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Toaster } from "@/components/ui/sonner";
import { getCurrentRole } from "@/lib/dal";
import { getSessionToken } from "@/lib/session";
import type { Role } from "@/types";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Geist ไม่มีกลิฟภาษาไทย — ตัวนี้คือฟอนต์ที่แสดงข้อความไทยจริง ๆ
const notoThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai"],
});

export const metadata: Metadata = {
  title: "Sentinel | ระบบควบคุมการเข้า-ออก",
  description: "แดชบอร์ดติดตามการเข้า-ออกประตูด้วยบัตร RFID แบบเรียลไทม์",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ไม่มี session = ยังไม่ล็อกอิน -> ไม่ต้องโชว์เมนู (หน้า /login จะสะอาด)
  const signedIn = (await getSessionToken()) !== null;

  // role USER ไม่เห็นเมนูจัดการผู้ใช้งาน (backend ก็กันด้วย @AdminOnly อีกชั้น)
  let role: Role | null = null;
  if (signedIn) {
    try {
      role = await getCurrentRole();
    } catch {
      // backend ล่ม -> ซ่อนเมนูที่ต้องใช้สิทธิ์ไว้ก่อน ปลอดภัยกว่าเดาว่าเป็น ADMIN
      role = null;
    }
  }

  return (
    <html
      lang="th"
      // next-themes เขียนคลาส .dark ลง <html> หลัง hydrate — ต่างจาก markup ฝั่ง server เสมอ
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${notoThai.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {signedIn ? (
            <div className="min-h-screen lg:flex">
              <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-[#0d2430] text-white lg:flex">
                <div className="flex items-center gap-3 border-b border-white/10 px-7 py-8">
                  <div className="rounded-xl bg-teal-400/15 p-2.5 text-teal-300"><DoorClosed className="size-6" /></div>
                  <div><p className="font-heading text-xl font-bold tracking-tight">SENTINEL<span className="text-teal-400">.</span></p><p className="text-[10px] font-semibold tracking-[.22em] text-slate-400">ACCESS CONTROL</p></div>
                </div>
                <div className="px-5 pt-10"><p className="mb-4 px-3 text-[10px] font-bold tracking-[.22em] text-slate-500">พื้นที่ทำงาน / WORKSPACE</p><MainNav role={role} /></div>
                <div className="mt-auto space-y-5 border-t border-white/10 p-6">
                  <div className="flex items-center gap-3 rounded-xl border border-teal-400/15 bg-teal-400/5 p-3 text-xs text-slate-300"><Radio className="size-4 shrink-0 text-teal-400" /><span>RFID · ESP32 · CAMERA<br /><span className="text-slate-500">ข้อมูลจากระบบจริง</span></span></div>
                  <p className="text-[11px] text-slate-500">SECURITY DOOR LOCK / IoT PROJECT</p>
                </div>
              </aside>
              <div className="min-w-0 flex-1">
                <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur-md">
                  <div className="mx-auto flex h-17 max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
                    <div className="flex items-center gap-3 lg:hidden"><DoorClosed className="size-5 text-primary" /><span className="font-heading font-bold">SENTINEL.</span></div>
                    <span className="hidden text-xs font-semibold tracking-widest text-muted-foreground lg:block">SECURITY OPERATIONS / DASHBOARD</span>
                    <div className="flex items-center gap-2">
                      {role !== null && <Badge variant="secondary">{role === "ADMIN" ? "ผู้ดูแลระบบ" : "ผู้ชม"}</Badge>}
                      <ThemeToggle />
                      <form action={logout}><Button type="submit" variant="ghost" size="sm" className="text-muted-foreground"><LogOut /><span className="hidden sm:inline">ออกจากระบบ</span></Button></form>
                    </div>
                  </div>
                  <div className="border-t px-4 py-2 sm:px-8 lg:hidden"><MainNav role={role} /></div>
                </header>
                <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 lg:py-10">{children}</main>
              </div>
            </div>
          ) : (
            <main>{children}</main>
          )}

          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
