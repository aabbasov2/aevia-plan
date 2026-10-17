"use client";

import { useMemo, useState } from "react";
import { addDays, isSameDay, startOfDay } from "date-fns";
import { CalendarPlus, Check, Circle, Clock3, MoreHorizontal, Play, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { format } from "date-fns";
import type { Task } from "@/lib/types";

type Filter = "All" | "Today" | "Upcoming" | "Later";

export function TodayTasksPanel({ onFocusTask }: { onFocusTask?: (taskId: string) => void }) {
  const tasks = useStore((s) => s.tasks);
  const events = useStore((s) => s.events);
  const toggleComplete = useStore((s) => s.toggleComplete);
  const scheduleUnscheduledTask = useStore((s) => s.scheduleUnscheduledTask);
  const [filter, setFilter] = useState<Filter>("Today");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [scheduleMessages, setScheduleMessages] = useState<Record<string, string>>({});
  const now = new Date();
  const today = startOfDay(now);
  const nextWeek = addDays(today, 7);

  const visibleTasks = useMemo(() => {
    const scheduledToday = new Set(events.filter((event) => !event.cancelled && isSameDay(new Date(event.start), now) && event.taskId).map((event) => event.taskId));
    return [...tasks].filter((task) => {
      const due = task.deadline ? new Date(task.deadline) : null;
      if (filter === "All") return true;
      if (filter === "Today") return Boolean(scheduledToday.has(task.id) || (due && isSameDay(due, today)) || (task.completedAt && isSameDay(new Date(task.completedAt), today)));
      if (filter === "Upcoming") return !task.completed && Boolean((due && due > now && due < nextWeek) || events.some((event) => event.taskId === task.id && !event.cancelled && new Date(event.start) > now && new Date(event.start) < nextWeek));
      return !task.completed && (!due || due >= nextWeek) && !events.some((event) => event.taskId === task.id && !event.cancelled && new Date(event.start) < nextWeek);
    }).sort((a, b) => {
      if (a.completed !== b.completed && filter !== "All") return a.completed ? 1 : -1;
      const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return aDeadline - bDeadline;
    });
  }, [events, filter, nextWeek, now, tasks, today]);

  return <>
    <section id="today-tasks" className="today-card overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div><h2 className="text-[20px] font-medium leading-6 text-fg">Tasks</h2><p className="mt-1 text-[11px] text-fg-subtle">Work that needs a place in your day</p></div>
        <button className="btn btn-gold h-9" onClick={() => setCreateOpen(true)}><Plus size={14} /> Add task</button>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--border)] px-5 py-2.5 sm:px-6">
        {(["All", "Today", "Upcoming", "Later"] as Filter[]).map((name) => <button key={name} onClick={() => setFilter(name)} className={`rounded-full px-3 py-1 text-[11px] transition-colors ${filter === name ? "bg-[var(--surface-2)] text-fg" : "text-fg-muted hover:text-fg"}`}>{name}</button>)}
        <span className="ml-auto shrink-0 text-[10px] text-fg-subtle">{visibleTasks.length} tasks</span>
      </div>
      {visibleTasks.length ? <div className="divide-y divide-[var(--border)]">
        {visibleTasks.slice(0, 8).map((task) => <TaskRow
          key={task.id}
          task={task}
          onEdit={() => setEditingTask(task)}
          onToggle={() => toggleComplete(task.id)}
          events={events}
          scheduleMessage={scheduleMessages[task.id]}
          onFocus={() => onFocusTask?.(task.id)}
          onSchedule={() => {
            const result = scheduleUnscheduledTask(task.id);
            setScheduleMessages((current) => ({
              ...current,
              [task.id]: result.scheduled ? "Added to your calendar" : "No available time found before the deadline",
            }));
          }}
        />)}
        {visibleTasks.length > 8 && <div className="px-6 py-3 text-center text-[11px] text-fg-muted">+{visibleTasks.length - 8} more tasks</div>}
      </div> : <div className="px-6 py-10 text-center"><p className="text-[14px] text-fg">Nothing in this view.</p><p className="mt-1 text-[11px] text-fg-muted">Add a task and Aevia will help find room for it.</p></div>}
    </section>
    <CreateTaskModal open={createOpen} onOpenChange={setCreateOpen} />
    <CreateTaskModal open={Boolean(editingTask)} task={editingTask ?? undefined} onOpenChange={(open) => { if (!open) setEditingTask(null); }} />
  </>;
}

function TaskRow({ task, onToggle, events, onSchedule, onFocus, onEdit, scheduleMessage }: {
  task: Task;
  onToggle: () => void;
  events: ReturnType<typeof useStore.getState>["events"];
  onSchedule: () => void;
  onFocus: () => void;
  onEdit: () => void;
  scheduleMessage?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const sessions = events.filter((event) => event.taskId === task.id && !event.cancelled).sort((a, b) => a.start.localeCompare(b.start));
  const first = sessions[0];
  const scheduledText = first ? `${format(new Date(first.start), "EEE HH:mm")}${sessions.length > 1 ? ` · ${sessions.length} blocks` : ""}` : "Unscheduled";
  return <div className={`flex min-w-0 items-center gap-3 px-5 py-3 sm:px-6 ${task.completed ? "opacity-55" : ""}`}>
    <button className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-fg-muted transition hover:text-gold" onClick={onToggle} aria-label={task.completed ? `Reopen ${task.title}` : `Complete ${task.title}`}>
      {task.completed ? <Check size={15} className="text-emerald-400" /> : <Circle size={17} strokeWidth={1.35} />}
    </button>
    <div className="min-w-0 flex-1">
      <div className={`truncate text-[12px] ${task.completed ? "text-fg-muted line-through" : "text-fg"}`}>{task.title}</div>
      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-fg-subtle">
        <Clock3 size={10} />
        <span>{task.durationMinutes >= 60 ? `${Math.floor(task.durationMinutes / 60)}h${task.durationMinutes % 60 ? ` ${task.durationMinutes % 60}m` : ""}` : `${task.durationMinutes}m`}</span>
        <span>·</span><span className={first ? "text-[var(--gold-strong)]" : ""}>{scheduledText}</span>
        {task.deadline && <><span>·</span><span>Due {format(new Date(task.deadline), "EEE, MMM d")}</span></>}
        {scheduleMessage && <><span>·</span><span className={scheduleMessage.startsWith("Added") ? "text-emerald-400" : "text-[#e6a07d]"}>{scheduleMessage}</span></>}
      </div>
    </div>
    {!first && !task.completed && <button className="btn h-7 shrink-0 px-2 text-[10px]" onClick={onSchedule} title={`Find time for ${task.title}`}><CalendarPlus size={12} /> Schedule</button>}
    {first && <span className="hidden shrink-0 text-[10px] text-fg-muted sm:inline">{scheduledText}</span>}
    {!task.completed && <button type="button" className="today-icon-button h-9 w-9 shrink-0" aria-label={`Focus on ${task.title}`} title={`Focus on ${task.title}`} onClick={onFocus}><Play size={13} /></button>}
    <div className="relative shrink-0">
      <button type="button" className="today-icon-button h-9 w-9" aria-label={`More options for ${task.title}`} title="More options" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><MoreHorizontal size={15} /></button>
      {menuOpen && <div role="menu" className="absolute right-0 top-full z-20 mt-1 min-w-36 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-xl">
        <button type="button" role="menuitem" className="w-full rounded-lg px-3 py-2 text-left text-[12px] text-fg transition hover:bg-[var(--surface-2)]" onClick={() => { setMenuOpen(false); onEdit(); }}>Edit task</button>
      </div>}
    </div>
  </div>;
}
