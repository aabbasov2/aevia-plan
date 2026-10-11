"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { addDays, format, startOfDay } from "date-fns";
import { AlertTriangle, ArrowUpRight, CalendarDays, CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import { AeviaArc } from "@/components/brand/AeviaArc";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { DayRecoveryModal } from "@/components/aevia/DayRecoveryModal";
import { CreateEventModal } from "@/components/calendar/CreateEventModal";
import { useStore } from "@/lib/store";
import type { CalendarEvent, Task } from "@/lib/types";
import { weekStart } from "@/lib/time";
import { buildPlan, planningWeekStart } from "@/lib/planner";

type PlanPreview = {
  targetWeek: Date;
  blocks: Array<{ task: Task; start: string; durationMinutes: number }>;
  unscheduled: string[];
  replacedBlocks: number;
};

type CommandResult = {
  intent: "create_task" | "create_event" | "plan_week" | "summarize" | "risks" | "availability" | "recover" | "clarify" | "out_of_scope";
  rangeStart?: string;
  rangeEnd?: string;
  eventTitle?: string;
  eventDate?: string;
  eventStartTime?: string;
  eventDurationMinutes?: number;
  eventKind?: "meeting" | "personal" | "focus";
  clarification?: string;
};

function localDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateRangeLabel(start: Date, endInclusive: Date) {
  return format(start, "yyyy-MM-dd") === format(endInclusive, "yyyy-MM-dd")
    ? format(start, "EEEE, MMM d")
    : `${format(start, "MMM d")}–${format(endInclusive, "MMM d")}`;
}

function eventsInRange(events: CalendarEvent[], start: Date, end: Date) {
  return events.filter((event) => {
    const at = new Date(event.start);
    return !event.cancelled && at >= start && at < end;
  });
}

function summarizePeriod(tasks: Task[], events: CalendarEvent[], start: Date, end: Date, label: string) {
  const rangeEvents = eventsInRange(events, start, end);
  const taskIds = new Set(rangeEvents.map((event) => event.taskId).filter((id): id is string => Boolean(id)));
  const dueTasks = tasks.filter((task) => task.deadline && new Date(task.deadline) >= start && new Date(task.deadline) < end);
  const periodTasks = Array.from(new Map([...dueTasks, ...tasks.filter((task) => taskIds.has(task.id))].map((task) => [task.id, task])).values());
  const taskMinutes = rangeEvents.filter((event) => event.taskId).reduce((sum, event) => sum + event.durationMinutes, 0);
  const completed = periodTasks.filter((task) => task.completed).length;
  const activeDue = dueTasks.filter((task) => !task.completed).length;
  return `${label}: ${rangeEvents.length} calendar event${rangeEvents.length === 1 ? "" : "s"}, ${taskMinutes ? `${Math.round(taskMinutes / 60 * 10) / 10}h of task time planned` : "no task blocks scheduled"}, ${activeDue} task${activeDue === 1 ? "" : "s"} due, ${completed} completed.`;
}

function riskSummary(tasks: Task[], events: CalendarEvent[], start: Date, end: Date, label: string) {
  const conflicts: Array<[CalendarEvent, CalendarEvent]> = [];
  const rangeEvents = eventsInRange(events, start, end).sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 0; i < rangeEvents.length; i += 1) {
    const first = rangeEvents[i];
    const firstStart = new Date(first.start).getTime();
    const firstEnd = firstStart + first.durationMinutes * 60_000;
    for (let j = i + 1; j < rangeEvents.length; j += 1) {
      const second = rangeEvents[j];
      const secondStart = new Date(second.start).getTime();
      if (secondStart >= firstEnd) break;
      if (secondStart + second.durationMinutes * 60_000 > firstStart) conflicts.push([first, second]);
    }
  }

  const atRisk = tasks.filter((task) => {
    if (task.completed || !task.deadline) return false;
    const due = new Date(task.deadline);
    if (due < start || due >= end) return false;
    const scheduled = events.filter((event) => event.taskId === task.id && !event.cancelled && new Date(event.start) < addDays(startOfDay(due), 1)).reduce((sum, event) => sum + event.durationMinutes, 0);
    return scheduled < task.durationMinutes;
  });

  if (atRisk.length === 0 && conflicts.length === 0) return `${label}: no unscheduled deadline work or calendar overlaps found.`;
  const taskText = atRisk.length ? `${atRisk.length} task${atRisk.length === 1 ? "" : "s"} still need time (${atRisk.slice(0, 3).map((task) => task.title).join(", ")}${atRisk.length > 3 ? ", …" : ""})` : "no deadline tasks need extra time";
  const conflictText = conflicts.length ? `${conflicts.length} calendar overlap${conflicts.length === 1 ? "" : "s"} (${conflicts.slice(0, 2).map(([a, b]) => `${a.title} / ${b.title}`).join(", ")})` : "no calendar overlaps";
  return `${label}: ${taskText}; ${conflictText}.`;
}

function availabilitySummary(events: CalendarEvent[], preferences: { workStartMinutes: number; workEndMinutes: number; bufferMinutes: number }, start: Date, end: Date, label: string) {
  const slots: Array<{ start: Date; end: Date }> = [];
  for (let day = startOfDay(start); day < end; day = addDays(day, 1)) {
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    const workStart = new Date(day);
    workStart.setMinutes(preferences.workStartMinutes, 0, 0);
    const workEnd = new Date(day);
    workEnd.setMinutes(preferences.workEndMinutes, 0, 0);
    const busy = events
      .filter((event) => !event.cancelled)
      .map((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(eventStart.getTime() + event.durationMinutes * 60_000);
        return { start: new Date(eventStart.getTime() - preferences.bufferMinutes * 60_000), end: new Date(eventEnd.getTime() + preferences.bufferMinutes * 60_000) };
      })
      .filter((event) => event.start < workEnd && event.end > workStart)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    let cursor = workStart;
    for (const event of busy) {
      if (event.start > cursor && event.start.getTime() - cursor.getTime() >= 30 * 60_000) slots.push({ start: cursor, end: event.start });
      if (event.end > cursor) cursor = event.end;
    }
    if (workEnd > cursor && workEnd.getTime() - cursor.getTime() >= 30 * 60_000) slots.push({ start: cursor, end: workEnd });
  }
  slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  if (!slots.length) return `${label}: I couldn't find a free 30-minute window during your work hours.`;
  return `${label}: ${slots.slice(0, 4).map((slot) => `${format(slot.start, "EEE HH:mm")}–${format(slot.end, "HH:mm")}`).join(" · ")}${slots.length > 4 ? ` · +${slots.length - 4} more` : ""}.`;
}

export function TodayCommandPanel() {
  const tasks = useStore((state) => state.tasks);
  const events = useStore((state) => state.events);
  const preferences = useStore((state) => state.plannerPreferences);
  const planWeek = useStore((state) => state.planWeek);
  const [request, setRequest] = useState("");
  const [taskRequest, setTaskRequest] = useState("");
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventDraft, setEventDraft] = useState<{ start: Date; title: string; durationMinutes: number; kind: "meeting" | "personal" | "focus" } | null>(null);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryDescription, setRecoveryDescription] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [planPreview, setPlanPreview] = useState<PlanPreview | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = request.trim();
    if (!message || busy) return;
    setRequest("");
    setBusy(true);
    setReply(null);
    try {
      const now = new Date();
      const response = await fetch("/api/ai/interpret-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, today: localDateString(now), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Aevia couldn't understand that request.");
      const command = data as CommandResult;
      const rangeStart = command.rangeStart ? new Date(`${command.rangeStart}T00:00:00`) : null;
      const rangeEnd = command.rangeEnd ? addDays(new Date(`${command.rangeEnd}T00:00:00`), 1) : null;
      const label = rangeStart && rangeEnd ? dateRangeLabel(rangeStart, addDays(rangeEnd, -1)) : "";

      switch (command.intent) {
        case "create_task":
          setTaskRequest(message);
          setTaskModalOpen(true);
          break;
        case "create_event": {
          if (!command.eventDate || !command.eventStartTime || !command.eventTitle || !command.eventDurationMinutes) {
            setReply(command.clarification || "What date, start time, and duration should I put on your calendar?");
            break;
          }
          setEventDraft({ start: new Date(`${command.eventDate}T${command.eventStartTime}:00`), title: command.eventTitle, durationMinutes: command.eventDurationMinutes, kind: command.eventKind ?? "meeting" });
          setEventModalOpen(true);
          break;
        }
        case "plan_week": {
          if (!rangeStart) { setReply("Which week should I plan?"); break; }
          createPlanPreview(rangeStart);
          break;
        }
        case "summarize":
          if (rangeStart && rangeEnd) setReply(summarizePeriod(tasks, events, rangeStart, rangeEnd, label));
          break;
        case "risks":
          if (rangeStart && rangeEnd) setReply(riskSummary(tasks, events, rangeStart, rangeEnd, label));
          break;
        case "availability":
          if (rangeStart && rangeEnd) setReply(availabilitySummary(events, preferences, rangeStart, rangeEnd, label));
          break;
        case "recover":
          setRecoveryDescription(message);
          setRecoveryOpen(true);
          break;
        case "clarify":
        case "out_of_scope":
          setReply(command.clarification || "I can help with your tasks, calendar, schedule, deadlines, and available time. What would you like to do?");
          break;
      }
    } catch (error) {
      setReply(error instanceof Error ? error.message : "Aevia couldn't understand that request. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function createPlanPreview(targetDate: Date) {
    const now = new Date();
    const targetWeek = weekStart(targetDate);
    const targetWeekEnd = addDays(targetWeek, 7);
    const completedIds = new Set(tasks.filter((task) => task.completed).map((task) => task.id));
    const managedEvents = events.filter((event) => {
      if (event.kind !== "task" || !event.taskId || event.cancelled || completedIds.has(event.taskId) || event.locked || event.origin === "user") return false;
      const start = new Date(event.start);
      return start >= targetWeek && start < targetWeekEnd && start >= now;
    });
    const managedIds = new Set(managedEvents.map((event) => event.id));
    const stableEvents = events.filter((event) => !managedIds.has(event.id));
    const plan = buildPlan(tasks, stableEvents, preferences, now, targetWeek);
    const unscheduled = new Set(plan.unscheduled);
    const blocks = plan.blocks.filter((block) => !unscheduled.has(block.task.id));
    setReply(null);
    setPlanPreview({ targetWeek, blocks, unscheduled: plan.unscheduled, replacedBlocks: managedEvents.length });
  }

  function planToday() {
    createPlanPreview(planningWeekStart(new Date()));
  }

  function applyPlanPreview() {
    if (!planPreview) return;
    const result = planWeek(planPreview.targetWeek.getTime());
    const weekLabel = `${format(planPreview.targetWeek, "MMM d")}–${format(addDays(planPreview.targetWeek, 6), "MMM d")}`;
    setPlanPreview(null);
    setReply(result.scheduledTaskCount
      ? `Plan applied for ${weekLabel}: ${result.scheduledTaskCount} task${result.scheduledTaskCount === 1 ? "" : "s"} scheduled across ${Math.round(result.scheduledMinutes / 60 * 10) / 10}h.`
      : result.unscheduled.length
        ? `No tasks could be scheduled for ${weekLabel}. Review the tasks that still need time.`
        : `Your plan for ${weekLabel} is up to date.`);
  }

  function summarizeDay() {
    const now = new Date();
    const start = startOfDay(now);
    setReply(summarizePeriod(tasks, events, start, addDays(start, 1), "Today"));
  }

  function showRisks() {
    const now = new Date();
    const start = weekStart(now);
    setReply(riskSummary(tasks, events, start, addDays(start, 7), dateRangeLabel(start, addDays(start, 6))));
  }

  return <>
    <section className="today-card overflow-hidden rounded-2xl">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4 sm:px-6">
        <AeviaArc size={23} />
        <div className="min-w-0 flex-1"><h2 className="text-[17px] font-medium text-fg">Aevia AI</h2><p className="text-[10px] text-fg-subtle">Your schedule, in context</p></div>
        <span className="flex items-center gap-1 text-[10px] text-fg-subtle"><span className={`h-1.5 w-1.5 rounded-full ${busy ? "animate-pulse bg-gold" : "bg-emerald-400"}`} />{busy ? "Thinking…" : "Ready"}</span>
      </div>
      <div className="p-5 sm:p-6">
        <div className="inline-flex max-w-full items-start gap-2 rounded-xl rounded-tl-sm bg-[var(--surface-2)] px-3.5 py-3 text-[12px] leading-5 text-fg-muted"><Sparkles size={14} className="mt-0.5 shrink-0 text-gold" />What would you like help with?</div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <QuickAction icon={<CalendarDays size={13} />} label="Plan my day" onClick={planToday} />
          <QuickAction icon={<AlertTriangle size={13} />} label="What’s at risk?" onClick={showRisks} />
          <QuickAction icon={<CheckCircle2 size={13} />} label="Summarize today" onClick={summarizeDay} />
          <QuickAction icon={<RotateCcw size={13} />} label="My day changed" onClick={() => { setRecoveryDescription(""); setRecoveryOpen(true); }} />
        </div>

        {planPreview && <PlanPreviewCard preview={planPreview} tasks={tasks} onApply={applyPlanPreview} onCancel={() => setPlanPreview(null)} />}
        {reply && <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-[11px] leading-5 text-fg-muted" aria-live="polite">{reply}{reply.toLowerCase().includes("task") && <Link href="/tasks" className="ml-1 text-gold">Open tasks <ArrowUpRight size={11} className="inline" /></Link>}</div>}

        <form onSubmit={handleSubmit} className="mt-5 flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] p-2 pl-3 focus-within:border-[var(--ring)]">
          <input value={request} onChange={(event) => setRequest(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[11px] text-fg outline-none placeholder:text-fg-subtle" placeholder="Ask about your plan, or tell Aevia what to schedule…" aria-label="Ask Aevia about your schedule" />
          <button disabled={!request.trim() || busy} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gold)] text-[#12100d] transition hover:brightness-110 disabled:opacity-40" aria-label="Send request to Aevia">{busy ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" /> : <ArrowUpRight size={15} />}</button>
        </form>
        <p className="mt-2 text-[9px] leading-4 text-fg-subtle">Ask about tasks, deadlines, your calendar, or free time. Aevia acts on your schedule data instead of making up an answer.</p>
      </div>
    </section>
    <CreateTaskModal open={taskModalOpen} onOpenChange={setTaskModalOpen} initialRequest={taskRequest} />
    <CreateEventModal open={eventModalOpen} onOpenChange={(open) => { setEventModalOpen(open); if (!open) setEventDraft(null); }} initialStart={eventDraft?.start} initialTitle={eventDraft?.title} initialDurationMinutes={eventDraft?.durationMinutes} initialKind={eventDraft?.kind} />
    <DayRecoveryModal open={recoveryOpen} onOpenChange={setRecoveryOpen} initialDescription={recoveryDescription} />
  </>;
}

function PlanPreviewCard({ preview, tasks, onApply, onCancel }: {
  preview: PlanPreview;
  tasks: Task[];
  onApply: () => void;
  onCancel: () => void;
}) {
  const unscheduledTasks = tasks.filter((task) => preview.unscheduled.includes(task.id));
  const plannedHours = Math.round(preview.blocks.reduce((sum, block) => sum + block.durationMinutes, 0) / 60 * 10) / 10;
  const hasChanges = preview.blocks.length > 0 || preview.replacedBlocks > 0;
  return <div className="mt-4 overflow-hidden rounded-xl border border-[var(--gold)]/30 bg-[var(--surface)]" aria-live="polite">
    <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-3.5 py-3">
      <div><p className="text-[12px] font-medium text-fg">Review this plan</p><p className="mt-0.5 text-[10px] text-fg-muted">{format(preview.targetWeek, "MMM d")}–{format(addDays(preview.targetWeek, 6), "MMM d")} · {preview.blocks.length} blocks · {plannedHours}h</p></div>
      <span className="rounded-full bg-[var(--gold-soft)] px-2 py-1 text-[9px] text-gold">Preview</span>
    </div>
    {preview.blocks.length > 0 ? <div className="max-h-48 divide-y divide-[var(--border)] overflow-y-auto">
      {preview.blocks.slice(0, 8).map((block, index) => <div key={`${block.task.id}-${block.start}-${index}`} className="flex items-center justify-between gap-3 px-3.5 py-2 text-[10px]">
        <span className="min-w-0 truncate text-fg">{block.task.title}</span>
        <span className="shrink-0 text-fg-muted">{format(new Date(block.start), "EEE, MMM d · HH:mm")} · {block.durationMinutes}m</span>
      </div>)}
      {preview.blocks.length > 8 && <p className="px-3.5 py-2 text-[9px] text-fg-subtle">+{preview.blocks.length - 8} more blocks</p>}
    </div> : <p className="px-3.5 py-3 text-[10px] text-fg-muted">{hasChanges ? "No new task blocks fit in this plan." : "Your calendar already has a plan for this week."}</p>}
    {unscheduledTasks.length > 0 && <p className="border-t border-[var(--border)] px-3.5 py-2 text-[10px] text-[#e6a07d]">Still needs room: {unscheduledTasks.slice(0, 3).map((task) => task.title).join(", ")}{unscheduledTasks.length > 3 ? ` +${unscheduledTasks.length - 3} more` : ""}</p>}
    {preview.replacedBlocks > 0 && <p className="border-t border-[var(--border)] px-3.5 py-2 text-[9px] text-fg-subtle">Applying will refresh {preview.replacedBlocks} existing Aevia-planned block{preview.replacedBlocks === 1 ? "" : "s"} for this week.</p>}
    <div className="flex justify-end gap-2 border-t border-[var(--border)] px-3.5 py-2.5">
      <button type="button" className="btn h-7 px-2.5 text-[10px]" onClick={onCancel}>Keep current plan</button>
      <button type="button" className="btn btn-gold h-7 px-2.5 text-[10px] disabled:opacity-40" onClick={onApply} disabled={!hasChanges}>Apply plan</button>
    </div>
  </div>;
}

function QuickAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return <button onClick={onClick} className="group rounded-lg border border-transparent px-2.5 py-2 text-left transition hover:border-[var(--border)] hover:bg-[var(--surface-2)]">
    <span className="flex items-center gap-2 text-[10px] text-fg"><span className="text-gold">{icon}</span>{label}</span>
    <span className="mt-1 block pl-[21px] text-[9px] text-fg-subtle">{label === "Plan my day" ? "Find room for tasks" : label === "What’s at risk?" ? "Check your deadlines" : label === "Summarize today" ? "See the day at a glance" : "Replan around a change"}</span>
  </button>;
}
