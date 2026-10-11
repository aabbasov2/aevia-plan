"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckSquare2, Search } from "lucide-react";
import { format } from "date-fns";
import { useStore } from "@/lib/store";

export function SidebarSearch() {
  const tasks = useStore((state) => state.tasks);
  const events = useStore((state) => state.events);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return { tasks: [], events: [] };
    return {
      tasks: tasks.filter((task) => task.title.toLocaleLowerCase().includes(needle)).slice(0, 4),
      events: events.filter((event) => !event.cancelled && event.title.toLocaleLowerCase().includes(needle)).slice(0, 4),
    };
  }, [events, query, tasks]);
  const hasResults = matches.tasks.length + matches.events.length > 0;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return <div className="relative mx-3 mb-4">
    <div className="flex h-10 items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--bg)]/75 px-3 focus-within:border-[var(--ring)]">
      <Search size={14} className="shrink-0 text-fg-muted" />
      <input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 150)} className="min-w-0 flex-1 bg-transparent text-[11px] text-fg outline-none placeholder:text-fg-muted" placeholder="Search anything…" aria-label="Search tasks and calendar" />
      <kbd className="hidden rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px] text-fg-subtle lg:inline">⌘ K</kbd>
    </div>
    {open && query.trim() && <div className="absolute left-0 right-0 top-12 z-50 max-h-[360px] overflow-y-auto rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-2 shadow-2xl">
      {!hasResults ? <p className="px-2 py-3 text-[11px] text-fg-muted">No matching tasks or events.</p> : <>
        {matches.tasks.length > 0 && <ResultGroup label="Tasks">{matches.tasks.map((task) => <Link key={task.id} href="/tasks" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-[11px] text-fg hover:bg-[var(--surface-2)]"><CheckSquare2 size={13} className="shrink-0 text-gold" /><span className="min-w-0 flex-1 truncate">{task.title}</span><span className="text-[9px] text-fg-subtle">{task.completed ? "Done" : task.deadline ? format(new Date(task.deadline), "MMM d") : "Task"}</span></Link>)}</ResultGroup>}
        {matches.events.length > 0 && <ResultGroup label="Calendar">{matches.events.map((event) => <Link key={event.id} href="/calendar" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-[11px] text-fg hover:bg-[var(--surface-2)]"><CalendarDays size={13} className="shrink-0 text-[#e67b89]" /><span className="min-w-0 flex-1 truncate">{event.title}</span><span className="text-[9px] text-fg-subtle">{format(new Date(event.start), "MMM d, HH:mm")}</span></Link>)}</ResultGroup>}
      </>}
    </div>}
  </div>;
}

function ResultGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-1 last:mb-0"><p className="px-2 pb-1 pt-1 text-[9px] uppercase tracking-wider text-fg-subtle">{label}</p>{children}</div>;
}
