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
    <nav aria-label="เมนูหลัก" className="flex gap-2 lg:flex-col">
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
                "inline-flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors lg:w-full",
                active
                  ? "bg-primary/15 text-primary lg:bg-teal-400/15 lg:text-teal-300"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground lg:text-slate-400 lg:hover:bg-white/10 lg:hover:text-white",
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
