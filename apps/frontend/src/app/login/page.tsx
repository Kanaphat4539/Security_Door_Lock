"use client";

import { AlertCircle, Camera, DoorClosed, Fingerprint, Radio, ShieldCheck } from "lucide-react";
import { useActionState, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuthPresentation } from "@/lib/auth-copy";

import { login, register, type AuthState } from "./actions";

const initialState: AuthState = { error: null };

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const presentation = getAuthPresentation(activeTab);
  // แยก state ของสองฟอร์ม จะได้ไม่เอา error ของอีกแท็บมาโชว์ผิดที่
  const [loginState, loginAction, loginPending] = useActionState(
    login,
    initialState,
  );
  const [registerState, registerAction, registerPending] = useActionState(
    register,
    initialState,
  );

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[#0b2733] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-20" aria-label="เกี่ยวกับระบบ">
        <div className="security-grid pointer-events-none absolute inset-0" />
        <div className="absolute -left-32 top-1/3 size-96 rounded-full bg-teal-400/15 blur-3xl" />
        <div className="relative flex items-center gap-3"><div className="rounded-xl bg-teal-400/15 p-3 text-teal-300"><DoorClosed className="size-7" /></div><div><p className="font-heading text-2xl font-bold tracking-tight">SENTINEL<span className="text-teal-400">.</span></p><p className="text-[10px] font-semibold tracking-[.25em] text-slate-400">ACCESS CONTROL SYSTEM</p></div></div>
        <div className="relative max-w-xl">
          <p className="mb-5 text-xs font-bold tracking-[.25em] text-teal-300">SECURE EVERY ENTRY</p>
          <h1 className="font-heading text-5xl font-bold leading-[1.3] tracking-tight xl:text-6xl">ทุกการเข้าออก<br /><span className="text-teal-300">อยู่ในการดูแล</span></h1>
          <p className="mt-7 max-w-md text-base leading-8 text-slate-300">ระบบจัดการประตูอัจฉริยะที่เชื่อมบัตร RFID กล้อง และบันทึกเหตุการณ์เรียลไทม์เข้าด้วยกัน</p>
          <div className="mt-12 grid grid-cols-3 gap-3 border-t border-white/15 pt-7 text-xs text-slate-300"><span className="flex items-center gap-2"><Fingerprint className="size-5 text-teal-300" /> RFID</span><span className="flex items-center gap-2"><Camera className="size-5 text-teal-300" /> CAMERA</span><span className="flex items-center gap-2"><Radio className="size-5 text-teal-300" /> REAL-TIME</span></div>
        </div>
        <p className="relative text-xs text-slate-500">SECURITY DOOR LOCK · IoT PROJECT</p>
      </section>
      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
      <div className="w-full max-w-md">
      <div className="mb-8">
        <div className="mb-6 flex items-center gap-2 font-heading text-xl font-bold lg:hidden"><DoorClosed className="size-6 text-primary" /> SENTINEL.</div>
        <div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-[.18em] text-primary"><ShieldCheck className="size-4" /> SECURE ACCESS</div>
        <h2 className="font-heading text-3xl font-bold tracking-tight">{presentation.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{presentation.description}</p>
      </div>

      <Card className="border-border/80 shadow-xl shadow-slate-900/5">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")}>
          <CardHeader>
            <TabsList className="w-full">
              <TabsTrigger value="login">เข้าสู่ระบบ</TabsTrigger>
              <TabsTrigger value="register">สมัครสมาชิก</TabsTrigger>
            </TabsList>
          </CardHeader>

          <TabsContent value="login">
            <CardHeader className="pb-4">
              <CardTitle>เข้าสู่ระบบ</CardTitle>
              <CardDescription>ใช้บัญชีผู้ดูแลหรือบัญชีผู้ชมที่ลงทะเบียนไว้</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={loginAction} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="username">ชื่อผู้ใช้</Label>
                  <Input
                    id="username"
                    name="username"
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">รหัสผ่าน</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </div>

                {loginState.error !== null && (
                  <ErrorAlert message={loginState.error} />
                )}

                <Button
                  type="submit"
                  disabled={loginPending}
                  className="w-full"
                  size="lg"
                >
                  {loginPending ? "กำลังดำเนินการ..." : "เข้าสู่ระบบ"}
                </Button>
              </form>
            </CardContent>
          </TabsContent>

          <TabsContent value="register">
            <CardHeader className="pb-4">
              <CardTitle>สมัครสมาชิก</CardTitle>
              <CardDescription>สมัครบัญชีผู้ชมใหม่ด้วยรหัสเชิญจากผู้ดูแล</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={registerAction} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-username">ชื่อผู้ใช้</Label>
                  <Input
                    id="reg-username"
                    name="username"
                    autoComplete="username"
                    required
                    minLength={3}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-password">
                    รหัสผ่าน
                    <span className="font-normal text-muted-foreground">
                      (อย่างน้อย 8 ตัวอักษร)
                    </span>
                  </Label>
                  <Input
                    id="reg-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-confirm">ยืนยันรหัสผ่าน</Label>
                  <Input
                    id="reg-confirm"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-invite">
                    รหัสเชิญ
                    <span className="font-normal text-muted-foreground">
                      (จำเป็น)
                    </span>
                  </Label>
                  <Input
                    id="reg-invite"
                    name="inviteCode"
                    required
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    ขอจากผู้ดูแลระบบ — บัญชีที่สมัครเองจะเป็นสิทธิ์ผู้ชม
                    (ดูหน้าภาพรวมได้อย่างเดียว)
                  </p>
                </div>

                {registerState.error !== null && (
                  <ErrorAlert message={registerState.error} />
                )}

                <Button
                  type="submit"
                  disabled={registerPending}
                  className="w-full"
                  size="lg"
                >
                  {registerPending ? "กำลังดำเนินการ..." : "สมัครสมาชิก"}
                </Button>
              </form>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
      <p className="mt-6 text-center text-xs leading-6 text-muted-foreground">การเชื่อมต่อภายในเครือข่ายยังไม่มี HTTPS · หลีกเลี่ยงเครือข่ายสาธารณะ</p>
      </div>
      </section>
    </div>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
