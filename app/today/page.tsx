"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, CalendarDays, CalendarPlus, Check, CheckCircle2, ChevronDown, Clock3, Image as ImageIcon, ListTodo, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { derivePlanHealth } from "@/lib/plan-health";
import { TodayTimeline } from "@/components/today/TodayTimeline";
import { TodayTasksPanel } from "@/components/today/TodayTasksPanel";
import { TodayCommandPanel } from "@/components/aevia/TodayCommandPanel";
import { FocusWidget } from "@/components/today/FocusWidget";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { CreateEventModal } from "@/components/calendar/CreateEventModal";
import type { TodayBackground } from "@/lib/store";

const scenes: Array<{ id: TodayBackground; label: string; image: string }> = [
  { id: "mountains", label: "Mountains", image: "/today-scene-mountains.jpg" },
  { id: "cafe", label: "Coffee shop", image: "/today-scene-cafe.jpg" },
  { id: "library", label: "Library", image: "/today-scene-library.jpg" },
  { id: "rain", label: "Rainy city", image: "/today-scene-rain.jpg" },
];

export default function TodayPage() {
  const tasks = useStore((state) => state.tasks);
  const events = useStore((state) => state.events);
  const preferences = useStore((state) => state.plannerPreferences);
  const todayBackground = useStore((state) => state.todayBackground);
  const setTodayBackground = useStore((state) => state.setTodayBackground);
  const [now, setNow] = useState<Date | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [createEventStart, setCreateEventStart] = useState<Date | null>(null);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [sceneMenuOpen, setSceneMenuOpen] = useState(false);
  const [focusTaskRequest, setFocusTaskRequest] = useState<string | undefined>();

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const todayData = useMemo(() => {
    if (!now) return null;
    const todaysEvents = events.filter((event) => {
      const start = new Date(event.start);
      return !event.cancelled && start.getFullYear() === now.getFullYear() && start.getMonth() === now.getMonth() && start.getDate() === now.getDate();
    });
    const taskIds = new Set(todaysEvents.map((event) => event.taskId).filter((id): id is string => Boolean(id)));
    const dueToday = tasks.filter((task) => task.deadline && new Date(task.deadline).toDateString() === now.toDateString());
    const dayTasks = Array.from(new Map([...dueToday, ...tasks.filter((task) => taskIds.has(task.id))].map((task) => [task.id, task])).values());
    const upcoming = todaysEvents.find((event) => new Date(event.start).getTime() + event.durationMinutes * 60_000 > now.getTime());
    const workMinutes = todaysEvents.filter((event) => event.kind === "task").reduce((sum, event) => sum + event.durationMinutes, 0);
    const completed = dayTasks.filter((task) => task.completed).length;
    return { todaysEvents, dayTasks, upcoming, workMinutes, completed };
  }, [events, now, tasks]);

  const health = derivePlanHealth(tasks, events, preferences, now ?? new Date());
  const greeting = now ? (now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening") : "Good morning";

  const selectedScene = scenes.find((scene) => scene.id === todayBackground) ?? scenes[0];

  return <div className="today-page relative isolate min-h-screen overflow-hidden">
    <div aria-hidden="true" className="today-scene-photo pointer-events-none fixed inset-0 z-0 bg-cover bg-center transition-[background-image] duration-500" style={{ backgroundImage: `url("${selectedScene.image}")` }} />
    <div aria-hidden="true" className="today-scene-overlay pointer-events-none fixed inset-0 z-0" />
    <div className="relative z-10 mx-auto max-w-[1540px] px-4 pb-8 pt-7 sm:px-6 sm:pb-10 sm:pt-9 xl:px-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <div>
            <p className="text-[12px] tracking-wide text-fg-muted">{now ? format(now, "EEEE, d MMMM") : ""}</p>
            <h1 className="mt-1 text-[34px] font-medium leading-[1.12] tracking-[-0.035em] text-fg sm:text-[40px]">{greeting}, Aziz.</h1>
            <p className="mt-2 max-w-xl text-[14px] leading-6 text-fg-muted">You tell Aevia what. Aevia finds the when.</p>
          </div>
          <LocalDigitalClock />
        </div>
        <div className="relative flex self-start gap-2 sm:self-auto">
          <div className="relative">
            <button type="button" className="btn btn-secondary" aria-expanded={sceneMenuOpen} aria-label={`Choose background scene, current scene: ${selectedScene.label}`} onClick={() => { setSceneMenuOpen((open) => !open); setNewMenuOpen(false); }}><ImageIcon size={15} /><span className="hidden sm:inline">Scene</span><ChevronDown size={13} /></button>
            {sceneMenuOpen && <div className="absolute right-0 top-11 z-30 w-[284px] rounded-2xl border border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-3 shadow-2xl backdrop-blur-xl">
              <div className="mb-2 px-1"><p className="text-[12px] font-medium text-fg">Choose your scene</p><p className="mt-0.5 text-[10px] text-fg-muted">A calmer backdrop for your day.</p></div>
              <div className="grid grid-cols-2 gap-2">
                {scenes.map((scene) => {
                  const active = scene.id === todayBackground;
                  return <button key={scene.id} type="button" aria-pressed={active} onClick={() => { setTodayBackground(scene.id); setSceneMenuOpen(false); }} className={`group relative h-[76px] overflow-hidden rounded-xl border text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gold)] ${active ? "border-[var(--gold)] ring-1 ring-[var(--gold)]" : "border-white/10 hover:border-white/40"}`} style={{ backgroundImage: `linear-gradient(0deg, rgba(7,9,12,.76), rgba(7,9,12,.03) 85%), url("${scene.image}")`, backgroundSize: "cover", backgroundPosition: "center" }}>
                    <span className="absolute inset-x-2 bottom-2 flex items-center justify-between text-[11px] font-medium text-white">{scene.label}{active && <Check size={13} className="text-[#f0c878]" />}</span>
                  </button>;
                })}
              </div>
            </div>}
          </div>
          <button className="btn btn-gold" onClick={() => setNewMenuOpen((open) => !open)} aria-expanded={newMenuOpen}><Plus size={15} /> New <ChevronDown size={13} /></button>
          {newMenuOpen && <div className="absolute right-0 top-11 z-20 w-48 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-1.5 shadow-2xl">
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[12px] text-fg hover:bg-[var(--surface-2)]" onClick={() => { setNewMenuOpen(false); setCreateTaskOpen(true); }}><ListTodo size={14} className="text-gold" />New task</button>
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[12px] text-fg hover:bg-[var(--surface-2)]" onClick={() => { setNewMenuOpen(false); setCreateEventStart(new Date()); setCreateEventOpen(true); }}><CalendarPlus size={14} className="text-[#e67b89]" />Calendar event</button>
          </div>}
        </div>
      </header>

      <section aria-label="Today at a glance" className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-7 sm:grid-cols-4 sm:gap-3">
        <SummaryCard icon={<CheckCircle2 size={17} />} label="Tasks" value={todayData ? `${todayData.completed}/${todayData.dayTasks.length}` : "—"} sub={todayData?.dayTasks.length ? "completed today" : "due or scheduled today"} tone="green" progress={todayData && todayData.dayTasks.length ? todayData.completed / todayData.dayTasks.length : undefined} onClick={() => scrollToSection("today-tasks")} />
        <SummaryCard icon={<CalendarDays size={17} />} label="Calendar" value={todayData ? `${todayData.todaysEvents.length} events` : "—"} sub={todayData?.upcoming ? `Next ${format(new Date(todayData.upcoming.start), "HH:mm")}` : "No more events today"} tone="rose" onClick={() => scrollToSection("today-timeline")} />
        <SummaryCard icon={<Clock3 size={17} />} label="Work planned" value={todayData ? `${Math.floor(todayData.workMinutes / 60)}h${todayData.workMinutes % 60 ? ` ${todayData.workMinutes % 60}m` : ""}` : "—"} sub="Task time on today’s calendar" tone="gold" onClick={() => scrollToSection("today-timeline")} />
        <SummaryCard icon={health.state === "wont-fit" ? <AlertTriangle size={17} /> : <Check size={17} />} label="Plan" value={health.state === "on-track" ? "On track" : health.state === "needs-attention" ? "Needs attention" : "Tight"} sub={health.state === "wont-fit" ? `${health.shortfallHours}h over capacity` : health.state === "needs-attention" ? `${health.unscheduledHours}h still to place` : `${health.remainingHours}h task time remaining`} tone={health.state === "wont-fit" ? "rose" : "green"} onClick={() => scrollToSection("today-plan-status")} />
      </section>

      <div className="mt-5 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.22fr)_minmax(380px,0.88fr)] xl:gap-4">
        <TodayTimeline now={now ?? new Date()} onCreateEvent={(start) => { setCreateEventStart(start); setCreateEventOpen(true); }} onFocusTask={(taskId) => setFocusTaskRequest(taskId)} />
        <div className="flex min-w-0 flex-col gap-4">
          <TodayCommandPanel />
          <FocusWidget requestedTaskId={focusTaskRequest} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.22fr)_minmax(380px,0.88fr)] xl:gap-4">
        <TodayTasksPanel onFocusTask={(taskId) => { setFocusTaskRequest(taskId); document.getElementById("today-focus")?.scrollIntoView({ behavior: "smooth", block: "center" }); }} />
        <PlanStatusCard health={health} />
      </div>
    </div>
    <CreateTaskModal open={createTaskOpen} onOpenChange={setCreateTaskOpen} />
    <CreateEventModal open={createEventOpen} initialStart={createEventStart} onOpenChange={setCreateEventOpen} />
  </div>;
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function LocalDigitalClock() {
  const [localNow, setLocalNow] = useState<Date | null>(null);

  useEffect(() => {
    setLocalNow(new Date());
    const timer = window.setInterval(() => setLocalNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const time = localNow ? format(localNow, "HH:mm") : "--:--";
  const date = localNow ? format(localNow, "EEEE, d MMMM") : "";
  return <div className="flex items-center gap-4 border-l border-white/20 pl-5 sm:gap-4 sm:pl-6">
    <div aria-hidden="true" className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 text-[#efbd59] shadow-[0_8px_30px_rgba(0,0,0,0.22)] backdrop-blur-md sm:h-[76px] sm:w-[76px]">
      <Clock3 size={32} strokeWidth={1.55} className="sm:hidden" />
      <Clock3 size={38} strokeWidth={1.45} className="hidden sm:block" />
    </div>
    <div className="min-w-[145px]">
      <time aria-label={localNow ? `Local time ${time}` : "Local time"} className="block font-mono text-[30px] font-medium leading-none tabular-nums tracking-[-0.055em] text-fg drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] sm:text-[36px]">
        {time}
      </time>
      <p className="mt-2 text-[11px] text-fg-muted sm:text-[12px]">{date}</p>
      <p className="mt-1 flex items-center gap-1.5 text-[10px] text-fg-subtle sm:text-[11px]">
        <span aria-hidden="true" className="text-[#efbd59]">⌖</span> Tallinn, Estonia
      </p>
    </div>
  </div>;
}

function SummaryCard({ icon, label, value, sub, tone, progress, onClick }: { icon: React.ReactNode; label: string; value: string; sub: string; tone: "green" | "rose" | "gold"; progress?: number; onClick: () => void }) {
  const colors = { green: "#62c991", rose: "#e67b89", gold: "#dfb45f" };
  return <button type="button" onClick={onClick} aria-label={`Go to ${label}`} className="today-metric-card min-w-0 rounded-xl px-3.5 py-3.5 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gold)] sm:px-4">
    <div className="flex items-center gap-2"><span style={{ color: colors[tone] }}>{icon}</span><span className="truncate text-[11px] text-fg-muted">{label}</span></div>
    <div className="mt-2 truncate text-[21px] font-medium leading-6 text-fg sm:text-[23px]">{value}</div>
    <div className="mt-1 truncate text-[10px] text-fg-subtle">{sub}</div>
    {progress !== undefined && <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#62c991] transition-all" style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }} /></div>}
  </button>;
}

function PlanStatusCard({ health }: { health: ReturnType<typeof derivePlanHealth> }) {
  const title = health.state === "on-track" ? "Your week has room." : health.state === "needs-attention" ? "A few tasks need a time." : "Your week is over capacity.";
  const detail = health.state === "on-track" ? `${health.remainingHours}h of remaining work fits in your available calendar.` : health.state === "needs-attention" ? `${health.unscheduledHours}h still needs scheduling. Aevia can find open blocks before the deadlines.` : `You need ${health.shortfallHours}h more time before ${health.deadlineLabel}. Review the tasks competing for space.`;
  return <section id="today-plan-status" className="today-card flex min-h-[150px] items-center gap-4 rounded-2xl p-5 sm:p-6">
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${health.state === "wont-fit" ? "bg-[#e67b89]/10 text-[#e67b89]" : "bg-[var(--gold-soft)] text-gold"}`}>{health.state === "wont-fit" ? <AlertTriangle size={19} /> : <CheckCircle2 size={19} />}</div>
    <div className="min-w-0"><p className="text-[14px] font-medium text-fg">{title}</p><p className="mt-1 max-w-lg text-[11px] leading-5 text-fg-muted">{detail}</p></div>
  </section>;
}
