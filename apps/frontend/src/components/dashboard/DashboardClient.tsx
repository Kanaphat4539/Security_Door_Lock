"use client";

import { CreditCard, LogIn, ShieldX, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
import type { AccessAttempt, AccessStats } from "@/types";
import { useRealtimeAccess } from "@/hooks/useRealtimeAccess";

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
    <Card>
      <CardContent className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p
            className={cn(
              "mt-1.5 font-heading text-3xl font-semibold tabular-nums",
              tone === "danger" && "text-destructive",
            )}
          >
            {value}
          </p>
        </div>
        <div
          className={cn(
            "rounded-lg p-2",
            tone === "danger"
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4" />
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
}: {
  initialLogs: AccessAttempt[];
  initialStats: AccessStats;
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [stats, setStats] = useState(initialStats);

  const connection = useRealtimeAccess(
    useCallback((log: AccessAttempt) => {
      setLogs((prev) => [log, ...prev].slice(0, MAX_ROWS));

      // นับเพิ่มเองเลย ไม่ต้องยิง API ซ้ำทุกครั้งที่มีคนทาบบัตร
      setStats((prev) => ({
        ...prev,
        entriesToday:
          log.status === "granted" && log.direction === "in"
            ? prev.entriesToday + 1
            : prev.entriesToday,
        deniedToday:
          log.status === "denied" ? prev.deniedToday + 1 : prev.deniedToday,
      }));
    }, []),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            ภาพรวมระบบ
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            สถิติของวันนี้และประวัติการเข้า-ออกล่าสุด
          </p>
        </div>
        <ConnectionIndicator state={connection} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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

      <Card className="py-0">
        <div className="border-b px-4 py-3">
          <h2 className="font-heading text-sm font-medium">
            ประวัติการเข้า-ออกล่าสุด
          </h2>
        </div>
        <AccessLogTable logs={logs} />
      </Card>
    </div>
  );
}
