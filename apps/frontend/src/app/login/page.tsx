"use client";

import { AlertCircle, DoorOpen } from "lucide-react";
import { useActionState } from "react";

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

import { login, register, type AuthState } from "./actions";

const initialState: AuthState = { error: null };

export default function LoginPage() {
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
    <div className="mx-auto flex max-w-sm flex-col justify-center py-12">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <DoorOpen className="size-6" />
        </div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Security Door Lock
        </h1>
        <p className="text-sm text-muted-foreground">
          ระบบควบคุมการเข้า-ออกประตูด้วยบัตร RFID
        </p>
      </div>

      <Card>
        <Tabs defaultValue="login">
          <CardHeader>
            <TabsList className="w-full">
              <TabsTrigger value="login">เข้าสู่ระบบ</TabsTrigger>
              <TabsTrigger value="register">สมัครสมาชิก</TabsTrigger>
            </TabsList>
          </CardHeader>

          <TabsContent value="login">
            <CardHeader className="pb-4">
              <CardTitle>เข้าสู่ระบบ</CardTitle>
              <CardDescription>เข้าสู่ระบบเพื่อดูข้อมูล</CardDescription>
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
              <CardDescription>สมัครบัญชีใหม่ด้วยรหัสเชิญ</CardDescription>
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
