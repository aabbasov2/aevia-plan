"use client";

import {
  Anchor,
  Calendar,
  FolderKanban,
  Lightbulb,
  LogOut,
  LayoutGrid,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
} from "lucide-react";
import { SidebarItem } from "./SidebarItem";
import { AeviaWordmark } from "@/components/brand/AeviaWordmark";
import { AeviaArc } from "@/components/brand/AeviaArc";
import { ThemeToggle } from "./ThemeToggle";
import { SidebarSearch } from "./SidebarSearch";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/shell/ProfileProvider";

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
        <div className="flex items-center gap-1"><AccountMenu compact /><ThemeToggle /></div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-4 border-t border-[var(--border)] bg-[var(--surface)]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden">
        <SidebarItem mobile href="/today" icon={<LayoutGrid size={16} />} label="Today" />
        <SidebarItem mobile href="/tasks" icon={<ListChecks size={16} />} label="Tasks" />
        <SidebarItem mobile href="/calendar" icon={<Calendar size={16} />} label="Calendar" />
        <SidebarItem mobile href="/thoughts" icon={<Lightbulb size={16} />} label="Thoughts" />
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
          <div className="flex items-center justify-between px-5 pb-5 pt-6">
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

          <SidebarSearch />

          <nav className="flex-1 space-y-0.5 px-3">
            <SidebarItem href="/today" icon={<LayoutGrid size={14} />} label="Today" />
            <SidebarItem href="/tasks" icon={<ListChecks size={14} />} label="Tasks" />
            <SidebarItem href="/calendar" icon={<Calendar size={14} />} label="Calendar" />
            <SidebarItem href="/thoughts" icon={<Lightbulb size={14} />} label="Thoughts" />
            <SidebarItem href="/commitments" icon={<Anchor size={14} />} label="Commitments" />
            <SidebarItem href="/projects" icon={<FolderKanban size={14} />} label="Projects" />
            <div className="mx-3 my-3 h-px bg-[var(--border)]" />
            <SidebarItem href="/aevia" icon={<AeviaArc size={14} />} label="Aevia" />
          </nav>

          <div className="mt-auto border-t border-[var(--border)] px-4 py-3">
            <div className="mb-3 flex items-center justify-between"><ThemeToggle /><span className="text-[11px] tracking-wider text-fg-subtle">v0.1</span></div>
            <AccountMenu />
          </div>
        </aside>
      )}
    </>
  );
}

function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { displayName } = useProfile();
  const [email, setEmail] = useState("");

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | undefined;
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
      const { data } = supabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user.email ?? ""));
      subscription = data.subscription;
    } catch {
      setEmail("");
    }
    return () => subscription?.unsubscribe();
  }, []);

  if (!email) return null;
  return <div className="flex items-center justify-between gap-2">
    {!compact && <span className="min-w-0 truncate text-[11px] text-fg-muted" title={email}>{displayName || email}</span>}
    <div className="flex shrink-0 items-center gap-1">
      <Link href="/settings/password" className="btn btn-ghost h-8 w-8 p-0" aria-label="Account settings" title="Account settings"><Settings2 size={14} /></Link>
      <button type="button" className="btn btn-ghost h-8 w-8 p-0" aria-label="Sign out" title="Sign out" onClick={async () => { try { await createClient().auth.signOut(); window.location.assign("/signin"); } catch { window.location.assign("/signin"); } }}><LogOut size={14} /></button>
    </div>
  </div>;
}
