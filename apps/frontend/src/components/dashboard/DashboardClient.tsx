"use client";

import { Activity, ArrowUpRight, Camera, CreditCard, Eye, LogIn, Radio, ShieldCheck, ShieldX, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { useCallback, useState } from "react";

import { AccessLogTable } from "@/components/dashboard/AccessLogTable";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getDashboardPresentation } from "@/lib/dashboard-copy";
import type { AccessAttempt, AccessStats, Role } from "@/types";
import { useRealtimeAccess } from "@/hooks/useRealtimeAccess";
import { api } from "@/services/api";

const MAX_ROWS = 50;

function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "default" | "danger";
}) {
  return (
    <Card className="border-border/80 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="flex items-start justify-between gap-3 py-1">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p
            className={cn(
              "mt-3 font-heading text-4xl font-bold tracking-tight tabular-nums",
              tone === "danger" && "text-destructive",
            )}
          >
            {value}
          </p>
        </div>
        <div
          className={cn(
            "rounded-xl p-3",
            tone === "danger"
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

const CONNECTION_LABEL = {
  connected: "เรียลไทม์",
  connecting: "กำลังเชื่อมต่อ",
  disconnected: "ขาดการเชื่อมต่อ",
} as const;

const CONNECTION_HINT = {
  connected: "เชื่อมต่อ WebSocket แล้ว รายการใหม่จะขึ้นเองทันที",
  connecting: "กำลังขอตั๋วและเชื่อมต่อ WebSocket",
  disconnected: "ต่อ WebSocket ไม่ได้ — ตรวจว่า backend รันอยู่ไหม",
} as const;

function ConnectionIndicator({
  state,
}: {
  state: keyof typeof CONNECTION_LABEL;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex cursor-default items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex size-2">
              {state === "connected" && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              )}
              <span
                className={cn(
                  "relative inline-flex size-2 rounded-full",
                  state === "connected" && "bg-emerald-500",
                  state === "connecting" && "bg-amber-500",
                  state === "disconnected" && "bg-destructive",
                )}
              />
            </span>
            {CONNECTION_LABEL[state]}
          </span>
        </TooltipTrigger>
        <TooltipContent>{CONNECTION_HINT[state]}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * ข้อมูลตั้งต้นมาจาก Server Component แล้ว (initialLogs/initialStats)
 * component นี้รับหน้าที่แค่ต่อ WebSocket แล้วเติมของใหม่เข้าไปด้านบน
 */
export function DashboardClient({
  initialLogs,
  initialStats,
  role,
}: {
  initialLogs: AccessAttempt[];
  initialStats: AccessStats;
  role: Role;
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [stats, setStats] = useState(initialStats);
  const view = getDashboardPresentation(role);
  const latestDenied = logs.find((item) => item.status === "denied");

  const connection = useRealtimeAccess(
    useCallback((log: AccessAttempt) => {
      setLogs((prev) => [log, ...prev.filter((item) => item.id !== log.id)].slice(0, MAX_ROWS));

      // ใช้ค่าจาก backend แทนการเดาว่า event อยู่ในช่วง "วันนี้" ของเซิร์ฟเวอร์
      void api.stats().then(setStats).catch(() => {});
    }, []),
  );

  return (
    <div className="space-y-7">
      <div className="relative overflow-hidden rounded-3xl bg-[#0d2936] px-6 py-8 text-white shadow-xl shadow-teal-950/10 sm:px-9 sm:py-10">
        <div className="security-grid pointer-events-none absolute inset-0" />
        <div className="absolute -right-20 -top-32 size-80 rounded-full bg-teal-400/15 blur-3xl" />
        <div className="relative flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-4 flex items-center gap-2 text-[11px] font-bold tracking-[.2em] text-teal-300"><ShieldCheck className="size-4" /> {view.eyebrow}</p>
            <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">{view.title}</h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">{view.description}</p>
          </div>
          <div className="w-fit rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-sm"><ConnectionIndicator state={connection} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="เข้าใช้งานวันนี้"
          value={stats.entriesToday}
          icon={LogIn}
        />
        <KpiCard
          label="ถูกปฏิเสธวันนี้"
          value={stats.deniedToday}
          icon={ShieldX}
          tone="danger"
        />
        <KpiCard label="ผู้ใช้ทั้งหมด" value={stats.totalUsers} icon={Users} />
        <KpiCard
          label="บัตรที่ใช้งานได้"
          value={stats.activeUsers}
          icon={CreditCard}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Card className="relative overflow-hidden border-border/80 shadow-sm">
          <div className="absolute right-0 top-0 h-32 w-48 rounded-full bg-primary/5 blur-3xl" />
          <CardContent className="relative flex h-full flex-col justify-between gap-6">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-bold tracking-[.16em] text-primary"><Radio className="size-4" /> WORKFLOW / ระบบหน้าประตู</p>
              <h2 className="mt-3 font-heading text-xl font-semibold">จากการทาบบัตรสู่บันทึกเหตุการณ์</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">ESP32 อ่าน UID → backend ตรวจสิทธิ์ → บันทึกผลและแสดงบนแดชบอร์ด</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-lg bg-primary/10 px-3 py-2 text-primary">01 · RFID</span><ArrowUpRight className="size-4 text-muted-foreground" />
              <span className="rounded-lg bg-primary/10 px-3 py-2 text-primary">02 · API</span><ArrowUpRight className="size-4 text-muted-foreground" />
              <span className="rounded-lg bg-primary/10 px-3 py-2 text-primary">03 · EVENT</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-sm">
          <CardContent className="flex h-full flex-col justify-between gap-5">
            {view.showManagement ? (
              <>
                <div><p className="flex items-center gap-2 text-[11px] font-bold tracking-[.16em] text-primary"><CreditCard className="size-4" /> ADMIN TOOLS</p><h2 className="mt-3 font-heading text-xl font-semibold">ดูแลสิทธิ์บัตร</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">บัตรที่ยังไม่ผูกผู้ใช้สามารถเลือก UID เพื่อลงทะเบียน หรือปิดใช้งานบัตรได้</p></div>
                <Link href="/users" className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-85">จัดการผู้ใช้งาน <ArrowUpRight className="size-4" /></Link>
              </>
            ) : (
              <>
                <div><p className="flex items-center gap-2 text-[11px] font-bold tracking-[.16em] text-primary"><Eye className="size-4" /> VIEWER ACCESS</p><h2 className="mt-3 font-heading text-xl font-semibold">ติดตามแบบอ่านอย่างเดียว</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">บัญชีผู้ชมตรวจสอบเหตุการณ์ได้ แต่เพิ่มหรือลบบัตรไม่ได้</p></div>
                <p className="rounded-lg border bg-muted/50 px-4 py-2.5 text-xs text-muted-foreground">ต้องการแก้สิทธิ์บัตร? ติดต่อผู้ดูแลระบบ</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex items-start gap-4 rounded-2xl border border-destructive/15 bg-destructive/5 p-5"><div className="rounded-xl bg-destructive/10 p-2.5 text-destructive"><ShieldX className="size-5" /></div><div><p className="text-xs font-bold tracking-wider text-destructive">LATEST DENIED / รายการที่ถูกปฏิเสธ</p><p className="mt-1 font-semibold">{latestDenied ? latestDenied.userName ?? latestDenied.uid : "ยังไม่มีในรายการล่าสุด"}</p><p className="mt-1 text-xs text-muted-foreground">{latestDenied ? `UID ${latestDenied.uid} · ${latestDenied.direction === "in" ? "ขาเข้า" : "ขาออก"}` : "แสดงจากประวัติสูงสุด 50 รายการ"}</p></div></div>
        <div className="flex items-start gap-4 rounded-2xl border border-primary/15 bg-primary/5 p-5"><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Camera className="size-5" /></div><div><p className="text-xs font-bold tracking-wider text-primary">CAMERA EVIDENCE / ภาพประกอบ</p><p className="mt-1 font-semibold">ภาพจากการทาบบัตรขาเข้า</p><p className="mt-1 text-xs text-muted-foreground">เมื่อ ESP32-CAM ลงทะเบียนและส่งภาพสำเร็จ กดดูได้ในตารางเหตุการณ์ด้านล่าง</p></div></div>
      </div>

      <Card className="overflow-hidden border-border/80 py-0 shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-5 sm:px-6">
          <div><p className="text-[11px] font-bold tracking-[.16em] text-primary">LIVE ACTIVITY</p><h2 className="mt-1 font-heading text-lg font-semibold">ประวัติการเข้า-ออกล่าสุด</h2></div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Activity className="size-4 text-primary" /> ล่าสุด 50 รายการ</div>
        </div>
        <AccessLogTable logs={logs} />
      </Card>
      <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5 text-sm">
        <p className="text-muted-foreground">{view.notice}</p>
      </div>
    </div>
  );
}
