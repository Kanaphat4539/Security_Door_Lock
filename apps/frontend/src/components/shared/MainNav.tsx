"use client";

import { LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { Role } from "@/types";

const LINKS = [
  { href: "/", label: "ภาพรวม", icon: LayoutDashboard, adminOnly: false },
  { href: "/users", label: "จัดการผู้ใช้งาน", icon: Users, adminOnly: true },
] as const;

/**
 * role ถูกส่งมาจาก layout (Server Component) ที่ถาม /auth/me มาแล้ว
 * ตรงนี้แค่ซ่อนเมนู — ด่านจริงคือ @AdminOnly() ฝั่ง Nest
 */
export function MainNav({ role }: { role: Role | null }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {LINKS.filter((link) => !link.adminOnly || role === "ADMIN").map(
        (link) => {
          const active =
            link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <link.icon className="size-4" />
              {link.label}
            </Link>
          );
        },
      )}
    </nav>
  );
}
