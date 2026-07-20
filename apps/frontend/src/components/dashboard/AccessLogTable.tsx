"use client";

import { ImageOff, Inbox } from "lucide-react";
import { useState } from "react";

import { DirectionBadge, StatusBadge } from "@/components/dashboard/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { imageUrl } from "@/services/api";
import type { AccessAttempt } from "@/types";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function AccessLogTable({ logs }: { logs: AccessAttempt[] }) {
  // เก็บทั้งแถวไว้ ไม่ใช่แค่ path จะได้เอา uid/เวลา ไปโชว์บนหัว dialog ได้
  const [preview, setPreview] = useState<AccessAttempt | null>(null);

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
        <Inbox className="size-8 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">
          ยังไม่มีประวัติการเข้า-ออก — ลองทาบบัตรที่เครื่องอ่านดู
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เวลา</TableHead>
              <TableHead>ภาพ</TableHead>
              <TableHead>ชื่อ</TableHead>
              <TableHead>UID</TableHead>
              <TableHead>ทิศทาง</TableHead>
              <TableHead className="text-right">สถานะ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                  {formatTime(log.createdAt)}
                </TableCell>

                <TableCell>
                  {log.imagePath ? (
                    <button
                      type="button"
                      onClick={() => setPreview(log)}
                      className="block overflow-hidden rounded-md ring-1 ring-foreground/10 transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`ดูภาพขนาดเต็มของ ${log.uid}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl(log.imagePath)}
                        alt={`ภาพตอน ${log.uid} ทาบบัตร`}
                        className="h-11 w-16 object-cover"
                      />
                    </button>
                  ) : (
                    <ImageOff className="size-4 text-muted-foreground/40" />
                  )}
                </TableCell>

                <TableCell className="font-medium">
                  {log.userName ?? (
                    <span className="font-normal text-muted-foreground italic">
                      ไม่รู้จัก
                    </span>
                  )}
                </TableCell>

                <TableCell className="font-mono text-xs">{log.uid}</TableCell>

                <TableCell>
                  <DirectionBadge direction={log.direction} />
                </TableCell>

                <TableCell className="text-right">
                  <StatusBadge status={log.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={preview !== null}
        onOpenChange={(open) => !open && setPreview(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono">{preview?.uid}</DialogTitle>
            <DialogDescription>
              {preview !== null &&
                `${preview.userName ?? "ไม่รู้จัก"} — ${formatTime(preview.createdAt)}`}
            </DialogDescription>
          </DialogHeader>

          {preview?.imagePath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl(preview.imagePath)}
              alt={`ภาพตอน ${preview.uid} ทาบบัตร`}
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
