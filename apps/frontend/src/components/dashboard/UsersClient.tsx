"use client";

import { History, Plus, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AccessLogTable } from "@/components/dashboard/AccessLogTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/services/api";
import type { AccessAttempt, UnassignedUid, User } from "@/types";

/**
 * ข้อมูลรายชื่อมาจาก Server Component
 * หลังแก้ข้อมูลเสร็จเรียก router.refresh() ให้ server ดึงใหม่
 * แทนการเก็บ state คู่ขนานไว้เองแล้วเสี่ยงหลุด sync กับ DB
 */
export function UsersClient({
  users,
  unassigned,
}: {
  users: User[];
  unassigned: UnassignedUid[];
}) {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [uid, setUid] = useState("");
  const [name, setName] = useState("");

  const [historyOf, setHistoryOf] = useState<User | null>(null);
  const [history, setHistory] = useState<AccessAttempt[]>([]);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);

  async function run(action: () => Promise<unknown>, successMessage: string) {
    setBusy(true);
    try {
      await action();
      toast.success(successMessage);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    void run(async () => {
      await api.createUser({ uid, name });
      setUid("");
      setName("");
    }, `เพิ่ม "${name}" แล้ว`);
  }

  async function showHistory(user: User) {
    try {
      setHistory(await api.userLogs(user.id));
      setHistoryOf(user);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "โหลดประวัติไม่สำเร็จ");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          จัดการผู้ใช้งาน
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          เพิ่มบัตร เปิด/ปิดการใช้งาน และดูประวัติรายบุคคล
        </p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="size-4" />
            เพิ่มบัตรใหม่
          </CardTitle>
          <CardDescription>
            เอาบัตรไปทาบที่เครื่องอ่านก่อน แล้วเลือก UID จากรายการด้านล่าง
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {unassigned.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                บัตรที่เคยถูกทาบแต่ยังไม่มีเจ้าของ — กดเพื่อเติม UID
              </Label>
              <div className="flex flex-wrap gap-2">
                {unassigned.map((item) => (
                  <Button
                    key={item.uid}
                    type="button"
                    variant={uid === item.uid ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setUid(item.uid)}
                    className="font-mono"
                  >
                    {item.uid}
                    <Badge variant="ghost" className="text-muted-foreground">
                      {item.attempts}×
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={handleCreate}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="space-y-1.5 sm:w-48">
              <Label htmlFor="uid">UID ของบัตร</Label>
              <Input
                id="uid"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                placeholder="A1B2C3D4"
                required
                className="font-mono"
              />
            </div>

            <div className="flex-1 space-y-1.5">
              <Label htmlFor="name">ชื่อผู้ใช้งาน</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น ธีรภัทร ทองสิงห์"
                required
              />
            </div>

            <Button type="submit" disabled={busy}>
              <Plus />
              เพิ่มบัตร
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="py-0">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <h2 className="font-heading text-sm font-medium">รายชื่อผู้มีสิทธิ์</h2>
          <Badge variant="secondary">{users.length}</Badge>
        </div>

        {users.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">
            ยังไม่มีผู้ใช้ในระบบ
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>UID</TableHead>
                  <TableHead>ใช้งาน</TableHead>
                  <TableHead>สถานะบัตร</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>

                    <TableCell className="font-mono text-xs">
                      {user.uid}
                    </TableCell>

                    <TableCell className="text-muted-foreground tabular-nums">
                      {user._count?.logs ?? 0} ครั้ง
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.isActive}
                          disabled={busy}
                          aria-label={`สลับสถานะบัตรของ ${user.name}`}
                          onCheckedChange={(checked) =>
                            void run(
                              () =>
                                api.updateUser(user.id, { isActive: checked }),
                              checked
                                ? `เปิดใช้งานบัตรของ ${user.name}`
                                : `ปิดใช้งานบัตรของ ${user.name}`,
                            )
                          }
                        />
                        <span className="text-xs text-muted-foreground">
                          {user.isActive ? "ใช้งานได้" : "ปิดใช้งาน"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void showHistory(user)}
                        >
                          <History />
                          ประวัติ
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={busy}
                          aria-label={`ลบ ${user.name}`}
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setPendingDelete(user)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* ประวัติรายบุคคล */}
      <Dialog
        open={historyOf !== null}
        onOpenChange={(open) => !open && setHistoryOf(null)}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>ประวัติของ {historyOf?.name}</DialogTitle>
            <DialogDescription className="font-mono">
              {historyOf?.uid}
            </DialogDescription>
          </DialogHeader>
          <div className="-mx-6 max-h-[60vh] overflow-y-auto">
            <AccessLogTable logs={history} />
          </div>
        </DialogContent>
      </Dialog>

      {/* ยืนยันการลบ — แทน confirm() ของเบราว์เซอร์ */}
      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ลบ &ldquo;{pendingDelete?.name}&rdquo;?</DialogTitle>
            <DialogDescription>
              ประวัติการเข้า-ออกจะยังอยู่ในระบบ แต่จะไม่ผูกกับชื่อนี้อีกต่อไป
              และบัตรใบนี้จะถูกปฏิเสธทันที
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">ยกเลิก</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => {
                const target = pendingDelete;
                if (target === null) return;
                setPendingDelete(null);
                void run(
                  () => api.deleteUser(target.id),
                  `ลบ "${target.name}" แล้ว`,
                );
              }}
            >
              <Trash2 />
              ลบผู้ใช้
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
