"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type Props = {
  href: string;
  icon: ReactNode;
  label: string;
  mobile?: boolean;
};

export function SidebarItem({ href, icon, label, mobile = false }: Props) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname?.startsWith(href));
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center rounded-md transition-colors",
        mobile
          ? "flex-col justify-center gap-1 px-2 py-2 text-[11px]"
          : "gap-3 px-3 py-2 text-[13px]",
        active
          ? "bg-[var(--gold-soft)] text-fg"
          : "text-fg-muted hover:text-fg hover:bg-[var(--surface-2)]"
      )}
    >
      {active && (
        <span
          className={cn(
            "absolute rounded-full bg-gold",
            mobile
              ? "bottom-0 left-1/2 h-[2px] w-5 -translate-x-1/2"
              : "left-0 top-1/2 h-4 w-[2px] -translate-y-1/2"
          )}
        />
      )}
      <span className={cn("flex h-4 w-4 items-center justify-center", active ? "text-gold" : "")}>
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}
