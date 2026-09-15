"use client";

import { Calendar, FolderKanban, Inbox, LayoutGrid, ListChecks, Anchor } from "lucide-react";
import { SidebarItem } from "./SidebarItem";
import { AeviaWordmark } from "@/components/brand/AeviaWordmark";
import { AeviaArc } from "@/components/brand/AeviaArc";
import { ThemeToggle } from "./ThemeToggle";

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-[240px] flex-col border-r border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-sm">
      <div className="px-5 pt-6 pb-8">
        <AeviaWordmark size="md" />
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        <SidebarItem href="/today" icon={<LayoutGrid size={14} />} label="Today" />
        <SidebarItem href="/inbox" icon={<Inbox size={14} />} label="Inbox" />
        <SidebarItem href="/tasks" icon={<ListChecks size={14} />} label="Tasks" />
        <SidebarItem href="/commitments" icon={<Anchor size={14} />} label="Commitments" />
        <SidebarItem href="/calendar" icon={<Calendar size={14} />} label="Calendar" />
        <SidebarItem href="/projects" icon={<FolderKanban size={14} />} label="Projects" />
        <div className="my-3 mx-3 h-px bg-[var(--border)]" />
        <SidebarItem href="/aevia" icon={<AeviaArc size={14} />} label="Aevia" />
      </nav>

      <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] px-5 py-4">
        <ThemeToggle />
        <span className="text-[11px] text-fg-subtle tracking-wider">v0.1</span>
      </div>
    </aside>
  );
}
