import { ArrowDownLeft, ArrowUpRight, Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { AccessStatus, Direction } from "@/types";

/**
 * สีเขียว/แดงไม่ได้อยู่ใน variant มาตรฐานของ shadcn จึงใส่คลาสเอง
 * (destructive มีอยู่ แต่ granted ไม่มีคู่ที่เป็นสีเขียว)
 */
export function StatusBadge({ status }: { status: AccessStatus }) {
  if (status === "granted") {
    return (
      <Badge className="bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400">
        <Check />
        อนุญาต
      </Badge>
    );
  }

  return (
    <Badge variant="destructive">
      <X />
      ปฏิเสธ
    </Badge>
  );
}

export function DirectionBadge({ direction }: { direction: Direction }) {
  const isIn = direction === "in";

  return (
    <Badge variant="outline" className="text-muted-foreground">
      {isIn ? <ArrowDownLeft /> : <ArrowUpRight />}
      {isIn ? "เข้า" : "ออก"}
    </Badge>
  );
}
