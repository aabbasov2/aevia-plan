"use client";

import {
  Anchor,
  Calendar,
  FolderKanban,
  Inbox,
  LayoutGrid,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { SidebarItem } from "./SidebarItem";
import { AeviaWordmark } from "@/components/brand/AeviaWordmark";
import { AeviaArc } from "@/components/brand/AeviaArc";
import { ThemeToggle } from "./ThemeToggle";

export function Sidebar({
  hidden,
  onVisibilityChange,
}: {
  hidden: boolean;
  onVisibilityChange: (hidden: boolean) => void;
}) {
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 backdrop-blur-sm md:hidden">
        <AeviaWordmark size="md" />
        <ThemeToggle />
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-3 border-t border-[var(--border)] bg-[var(--surface)]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden">
        <SidebarItem mobile href="/today" icon={<LayoutGrid size={16} />} label="Today" />
        <SidebarItem mobile href="/tasks" icon={<ListChecks size={16} />} label="Tasks" />
        <SidebarItem mobile href="/calendar" icon={<Calendar size={16} />} label="Calendar" />
      </nav>

      {hidden ? (
        <button
          className="btn fixed left-4 top-4 z-40 hidden h-9 w-9 bg-[var(--surface)] p-0 shadow-elev md:inline-flex"
          onClick={() => onVisibilityChange(false)}
          aria-label="Show navigation"
          title="Show navigation"
        >
          <PanelLeftOpen size={15} />
        </button>
      ) : (
        <aside className="fixed bottom-0 left-0 top-0 z-30 hidden h-screen w-[240px] flex-col border-r border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-sm md:flex">
          <div className="flex items-center justify-between px-5 pb-8 pt-6">
            <AeviaWordmark size="md" />
            <button
              className="btn btn-ghost h-8 w-8 p-0 text-fg-muted"
              onClick={() => onVisibilityChange(true)}
              aria-label="Hide navigation"
              title="Hide navigation"
            >
              <PanelLeftClose size={15} />
            </button>
          </div>

          <nav className="flex-1 space-y-0.5 px-3">
            <SidebarItem href="/today" icon={<LayoutGrid size={14} />} label="Today" />
            <SidebarItem href="/tasks" icon={<ListChecks size={14} />} label="Tasks" />
            <SidebarItem href="/calendar" icon={<Calendar size={14} />} label="Calendar" />
            <SidebarItem href="/inbox" icon={<Inbox size={14} />} label="Inbox" />
            <SidebarItem href="/commitments" icon={<Anchor size={14} />} label="Commitments" />
            <SidebarItem href="/projects" icon={<FolderKanban size={14} />} label="Projects" />
            <div className="mx-3 my-3 h-px bg-[var(--border)]" />
            <SidebarItem href="/aevia" icon={<AeviaArc size={14} />} label="Aevia" />
          </nav>

          <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] px-5 py-4">
            <ThemeToggle />
            <span className="text-[11px] tracking-wider text-fg-subtle">v0.1</span>
          </div>
        </aside>
      )}
    </>
  );
}
