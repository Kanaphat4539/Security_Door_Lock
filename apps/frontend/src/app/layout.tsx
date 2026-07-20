import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import { DoorOpen, LogOut } from "lucide-react";

import { logout } from "@/app/login/actions";
import { MainNav } from "@/components/shared/MainNav";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  title: "Security Door Lock — Dashboard",
  description: "ระบบควบคุมการเข้า-ออกประตูด้วยบัตร RFID",
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
      <body className="flex min-h-full flex-col bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {signedIn && (
            <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
              <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-6">
                <span className="flex items-center gap-2 font-heading text-sm font-semibold">
                  <DoorOpen className="size-5 text-primary" />
                  Security Door Lock
                </span>

                <Separator orientation="vertical" className="h-5" />

                <MainNav role={role} />

                <div className="ml-auto flex items-center gap-2">
                  {role !== null && (
                    <Badge variant="secondary">
                      {role === "ADMIN" ? "ผู้ดูแลระบบ" : "ผู้ชม"}
                    </Badge>
                  )}
                  <ThemeToggle />
                  <form action={logout}>
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                    >
                      <LogOut />
                      ออกจากระบบ
                    </Button>
                  </form>
                </div>
              </div>
            </header>
          )}

          <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
            {children}
          </main>

          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
