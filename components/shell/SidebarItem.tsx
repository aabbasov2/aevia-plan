"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type Props = {
  href: string;
  icon: ReactNode;
  label: string;
};

export function SidebarItem({ href, icon, label }: Props) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname?.startsWith(href));
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors",
        active
          ? "bg-[var(--gold-soft)] text-fg"
          : "text-fg-muted hover:text-fg hover:bg-[var(--surface-2)]"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-gold" />
      )}
      <span className={cn("flex h-4 w-4 items-center justify-center", active ? "text-gold" : "")}>
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}
