"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarPlus, ChevronLeft, ChevronRight, Clock3, Focus, Plus } from "lucide-react";
import { addDays, format, isSameDay, startOfDay, startOfWeek } from "date-fns";
import { useStore } from "@/lib/store";
import { formatHm } from "@/lib/time";
import { blockColor } from "@/lib/projects";
import type { CalendarEvent } from "@/lib/types";
import { CalendarEventIdentity, calendarEventAccent } from "@/components/calendar/CalendarEventIdentity";
import { EventEditorModal } from "@/components/calendar/EventEditorModal";
import { remainingMilliseconds } from "@/lib/focus-time";

const DAY_START = 7 * 60;
const DAY_END = 22 * 60;
const HOUR_HEIGHT = 42;
const DAY_HEIGHT = (DAY_END - DAY_START) / 60 * HOUR_HEIGHT;

function sameDay(iso: string, date: Date) {
  const d = new Date(iso);
  return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
}

type PositionedEvent = { event: CalendarEvent; lane: number; lanes: number; top: number; height: number };
type CalendarView = "day" | "week";

function positionEvents(events: CalendarEvent[], now: Date): PositionedEvent[] {
  const visible = events.filter((event) => {
    const start = new Date(event.start);
    const minute = start.getHours() * 60 + start.getMinutes();
    const allDay = event.durationMinutes >= 12 * 60;
    return sameDay(event.start, now) && !allDay && minute < DAY_END && minute + event.durationMinutes > DAY_START;
  }).sort((a, b) => a.start.localeCompare(b.start));

  const result: PositionedEvent[] = [];
  let cluster: CalendarEvent[] = [];
  let clusterEnd = -1;
  const flush = () => {
    if (!cluster.length) return;
    const laneEnds: number[] = [];
    const positioned = cluster.map((event) => {
      const start = new Date(event.start);
      const startMinute = Math.max(DAY_START, start.getHours() * 60 + start.getMinutes());
      const endMinute = Math.min(DAY_END, start.getHours() * 60 + start.getMinutes() + event.durationMinutes);
      let lane = laneEnds.findIndex((end) => end <= startMinute);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = endMinute;
      return { event, lane, top: ((startMinute - DAY_START) / 60) * HOUR_HEIGHT, height: Math.max(23, ((endMinute - startMinute) / 60) * HOUR_HEIGHT) };
    });
    positioned.forEach((item) => result.push({ ...item, lanes: laneEnds.length }));
    cluster = [];
    clusterEnd = -1;
  };

  for (const event of visible) {
    const start = new Date(event.start);
    const startMinute = start.getHours() * 60 + start.getMinutes();
    if (cluster.length && startMinute >= clusterEnd) flush();
    cluster.push(event);
    clusterEnd = Math.max(clusterEnd, startMinute + event.durationMinutes);
  }
  flush();
  return result;
}

export function TodayTimeline({
  now = new Date(),
  onCreateEvent,
  onFocusTask,
}: {
  now?: Date;
  onCreateEvent?: (start: Date) => void;
  onFocusTask?: (taskId: string) => void;
}) {
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(now));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [view, setView] = useState<CalendarView>("day");
  const events = useStore((s) => s.events);
  const focusSession = useStore((s) => s.focusSession);
  const setFocusModeOpen = useStore((s) => s.setFocusModeOpen);
  const viewingToday = isSameDay(selectedDate, now);

  useEffect(() => {
    // Keep the timeline following the real date when it was left on today overnight.
    if (isSameDay(selectedDate, now) && selectedDate.getTime() !== startOfDay(now).getTime()) {
      setSelectedDate(startOfDay(now));
    }
  }, [now, selectedDate]);

  const { todays, allDay, positioned, nextEvent } = useMemo(() => {
    const dayEvents = events.filter((event) => sameDay(event.start, selectedDate) && !event.cancelled).sort((a, b) => a.start.localeCompare(b.start));
    const allDayEvents = dayEvents.filter((event) => event.durationMinutes >= 12 * 60);
    return {
      todays: dayEvents,
      allDay: allDayEvents,
      positioned: positionEvents(dayEvents, selectedDate),
      nextEvent: dayEvents.find((event) => !viewingToday || new Date(event.start).getTime() + event.durationMinutes * 60_000 > now.getTime()),
    };
  }, [events, now, selectedDate, viewingToday]);

  const todayLabel = format(selectedDate, "EEEE, MMMM d");
  const weekStartDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStartDate, index));
  const viewingCurrentWeek = isSameDay(weekStartDate, startOfWeek(now, { weekStartsOn: 1 }));
  const heading = view === "week"
    ? viewingCurrentWeek ? "This week" : "Week view"
    : viewingToday ? "Today" : isSameDay(selectedDate, addDays(startOfDay(now), 1)) ? "Tomorrow" : isSameDay(selectedDate, addDays(startOfDay(now), -1)) ? "Yesterday" : format(selectedDate, "EEEE");
  const dateLabel = view === "week"
    ? `${format(weekStartDate, "MMM d")} – ${format(addDays(weekStartDate, 6), "MMM d")}`
    : todayLabel;
  const currentMinute = viewingToday ? now.getHours() * 60 + now.getMinutes() : -1;
  const currentTop = ((currentMinute - DAY_START) / 60) * HOUR_HEIGHT;
  const weekEvents = events
    .filter((event) => !event.cancelled && new Date(event.start) >= weekStartDate && new Date(event.start) < addDays(weekStartDate, 7))
    .sort((first, second) => first.start.localeCompare(second.start));
  const featuredEvent = view === "week"
    ? weekEvents.find((event) => !viewingCurrentWeek || new Date(event.start).getTime() + event.durationMinutes * 60_000 > now.getTime())
    : nextEvent;

  function requestCreateEvent() {
    const start = new Date(selectedDate);
    if (viewingToday) {
      const nextHalfHour = Math.ceil((now.getHours() * 60 + now.getMinutes()) / 30) * 30;
      start.setHours(Math.floor(nextHalfHour / 60), nextHalfHour % 60, 0, 0);
    } else {
      start.setHours(9, 0, 0, 0);
    }
    onCreateEvent?.(start);
  }

  return (
    <section id="today-timeline" className="today-card overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-[20px] font-medium leading-6 text-fg">{heading}</h2>
            <p className="mt-1 text-[11px] text-fg-subtle">{dateLabel}</p>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" className="today-icon-button" aria-label={view === "day" ? "Previous day" : "Previous week"} title={view === "day" ? "Previous day" : "Previous week"} onClick={() => setSelectedDate((date) => addDays(date, view === "day" ? -1 : -7))}><ChevronLeft size={15} /></button>
            <button type="button" className="today-icon-button" aria-label={view === "day" ? "Next day" : "Next week"} title={view === "day" ? "Next day" : "Next week"} onClick={() => setSelectedDate((date) => addDays(date, view === "day" ? 1 : 7))}><ChevronRight size={15} /></button>
            {!viewingToday && <button type="button" className="ml-1 rounded-md px-2 py-1 text-[10px] text-fg-muted transition hover:bg-[var(--surface-2)] hover:text-fg" onClick={() => setSelectedDate(startOfDay(now))}>Today</button>}
          </div>
          <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5" role="group" aria-label="Calendar view">
            {(["day", "week"] as CalendarView[]).map((option) => <button key={option} type="button" onClick={() => setView(option)} aria-pressed={view === option} className={`rounded-md px-2.5 py-1 text-[10px] capitalize transition ${view === option ? "bg-[var(--surface-2)] text-fg" : "text-fg-subtle hover:text-fg"}`}>{option}</button>)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={requestCreateEvent} className="today-view-link"><CalendarPlus size={13} /> Add event</button>
          <Link href="/calendar" className="today-view-link">Open calendar <ChevronRight size={13} /></Link>
        </div>
      </div>

      {viewingToday && focusSession?.kind === "focus" && (focusSession.status === "running" || focusSession.status === "paused") && <div className="flex items-center gap-2.5 border-b border-[var(--border)] bg-[var(--gold-soft)]/35 px-5 py-2.5 text-[10px] sm:px-6">
        <Focus size={13} className="shrink-0 text-gold" />
        <span className="min-w-0 flex-1 truncate text-fg">Focus underway{focusSession.taskTitle ? ` · ${focusSession.taskTitle}` : " · open session"}</span>
        <span className="shrink-0 tabular-nums text-fg-muted">{Math.floor(remainingMilliseconds(focusSession, now.getTime()) / 60_000)}m left</span>
        <button type="button" className="shrink-0 text-gold underline-offset-2 hover:underline" onClick={() => setFocusModeOpen(true)}>{focusSession.status === "paused" ? "Return to Focus" : "Open Focus"}</button>
      </div>}

      {featuredEvent && <button type="button" onClick={() => setSelectedEventId(featuredEvent.id)} className="flex w-full items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-2)]/45 px-5 py-3 text-left transition hover:bg-[var(--surface-2)] sm:px-6">
        <CalendarEventIdentity event={featuredEvent} size="normal" />
        <span className="min-w-0 flex-1"><span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-gold">Up next</span><span className="block truncate text-[12px] font-medium text-fg">{featuredEvent.title}</span></span>
        <span className="shrink-0 text-right"><span className="block text-[11px] font-medium text-fg">{format(new Date(featuredEvent.start), "HH:mm")}</span><span className="block text-[9px] text-fg-muted">{view === "week" ? viewingCurrentWeek ? nextEventStatus(featuredEvent, now) : format(new Date(featuredEvent.start), "EEE, MMM d") : viewingToday ? nextEventStatus(featuredEvent, now) : format(new Date(featuredEvent.start), "EEE, MMM d")}</span></span>
      </button>}

      {view === "week" ? (
        <div className="overflow-x-auto px-3 py-3 sm:px-5">
          <div className="grid min-w-[740px] grid-cols-7 gap-1.5">
            {weekDays.map((day) => {
              const dayEvents = weekEvents.filter((event) => sameDay(event.start, day));
              const selected = isSameDay(day, selectedDate);
              return <div key={day.toISOString()} className={`min-h-[250px] rounded-xl border p-2 ${selected ? "border-[var(--gold)]/50 bg-[var(--gold-soft)]/20" : "border-[var(--border)] bg-[var(--surface)]"}`}>
                <button type="button" onClick={() => { setSelectedDate(startOfDay(day)); setView("day"); }} className="mb-2 w-full rounded-lg px-1 py-1 text-left hover:bg-[var(--surface-2)]" aria-label={`Open ${format(day, "EEEE, MMMM d")} in day view`}>
                  <span className="block text-[9px] uppercase tracking-wide text-fg-subtle">{format(day, "EEE")}</span>
                  <span className={`mt-0.5 block text-[13px] font-medium ${isSameDay(day, now) ? "text-gold" : "text-fg"}`}>{format(day, "MMM d")}</span>
                </button>
                <div className="space-y-1">
                  {dayEvents.slice(0, 5).map((event) => <button key={event.id} type="button" onClick={() => setSelectedEventId(event.id)} className="flex w-full min-w-0 items-center gap-1 rounded-md border-l-2 px-1 py-1 text-left text-[9px] text-fg hover:brightness-125" style={{ background: blockColor(event.colorIndex), borderLeftColor: calendarEventAccent(event) }} title={`${format(new Date(event.start), "HH:mm")} · ${event.title}`}>
                    <CalendarEventIdentity event={event} size="tiny" /><span className="min-w-0 truncate">{format(new Date(event.start), "HH:mm")} {event.title}</span>
                  </button>)}
                  {dayEvents.length === 0 && <span className="block px-1 py-2 text-[9px] text-fg-subtle">No events</span>}
                  {dayEvents.length > 5 && <span className="block px-1 text-[9px] text-fg-subtle">+{dayEvents.length - 5} more</span>}
                </div>
              </div>;
            })}
          </div>
        </div>
      ) : <>
      {allDay.length > 0 && <div className="space-y-1 border-b border-[var(--border)] px-5 py-3 sm:px-6">{allDay.map((event) => <EventPill key={event.id} event={event} allDay onClick={() => setSelectedEventId(event.id)} />)}</div>}

      {todays.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
          <Clock3 size={20} className="text-gold" />
          <p className="mt-3 text-[15px] text-fg">A clear day is a useful starting point.</p>
          <p className="mt-1 text-[12px] text-fg-muted">Add a commitment or let Aevia find time for a task.</p>
          <button type="button" onClick={requestCreateEvent} className="btn btn-gold mt-4"><Plus size={14} /> Add event</button>
        </div>
      ) : (
        <div className="relative overflow-hidden px-3 pb-5 sm:px-5">
          <div className="relative" style={{ height: DAY_HEIGHT }}>
            {Array.from({ length: 16 }, (_, index) => {
              const minute = DAY_START + index * 60;
              const y = index * HOUR_HEIGHT;
              return <div key={minute} className="absolute inset-x-0 flex" style={{ top: y }}>
                <span className="w-[58px] shrink-0 -translate-y-1/2 pr-3 text-right text-[11px] tabular-nums text-fg-subtle">{formatHm(minute)}</span>
                <span className="relative flex-1 border-t border-[var(--border)]" />
              </div>;
            })}
            <div className="absolute bottom-0 left-[57px] top-0 border-l border-[var(--border)]" />
            {positioned.map(({ event, lane, lanes, top, height }) => (
              <button
                key={event.id}
                type="button"
                onClick={() => setSelectedEventId(event.id)}
                className={`today-event absolute cursor-pointer overflow-hidden rounded-md border-l-[3px] px-2.5 py-1.5 text-left transition hover:brightness-110 ${height < 34 ? "!py-0.5" : ""} ${featuredEvent?.id === event.id ? "z-[11] ring-2 ring-[var(--gold)] shadow-[0_0_18px_rgba(216,178,106,0.28)]" : ""}`}
                style={{
                  top,
                  height,
                  left: `calc(58px + (100% - 58px) * ${lane / lanes} + 10px)`,
                  width: `calc((100% - 58px) * ${1 / lanes} - 18px)`,
                  background: blockColor(event.colorIndex),
                  borderLeftColor: calendarEventAccent(event),
                }}
                title={`${event.title} · ${formatHm(new Date(event.start).getHours() * 60 + new Date(event.start).getMinutes())}–${formatHm(new Date(event.start).getHours() * 60 + new Date(event.start).getMinutes() + event.durationMinutes)}`}
              >
                {featuredEvent?.id === event.id && height >= 38 && <span className="absolute right-1.5 top-1 rounded bg-[var(--gold)] px-1 py-0.5 text-[7px] font-bold uppercase tracking-wide text-[#15120d]">Up next</span>}
                <div className="flex min-w-0 items-center gap-1.5">
                  <CalendarEventIdentity event={event} size={height < 34 ? "tiny" : "small"} />
                  <span className="truncate text-[12px] font-medium leading-4 text-fg">{event.title}</span>
                </div>
                {height >= 34 && <span className="block truncate pl-[23px] text-[10px] leading-4 text-fg-muted">{formatHm(new Date(event.start).getHours() * 60 + new Date(event.start).getMinutes())}–{formatHm(new Date(event.start).getHours() * 60 + new Date(event.start).getMinutes() + event.durationMinutes)}</span>}
              </button>
            ))}
            {currentMinute >= DAY_START && currentMinute <= DAY_END && <div className="pointer-events-none absolute left-[54px] right-0 z-10 flex items-center" style={{ top: currentTop }}><span className="h-2 w-2 rounded-full bg-[#e67b73]" /><span className="h-px flex-1 bg-[#e67b73]/75" /></div>}
          </div>
        </div>
      )}
      </>}

      <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 sm:px-6">
        <span className="text-[11px] text-fg-muted">{view === "week" ? `${weekEvents.length} events this week` : `${todays.length} event${todays.length === 1 ? "" : "s"} ${viewingToday ? "today" : `on ${format(selectedDate, "EEE")}`}`}</span>
        {view === "day" && (nextEvent ? <span className="text-[11px] text-fg-muted">{viewingToday ? "Next: " : "First: "}<span className="text-fg">{nextEvent.title}</span> at {formatHm(new Date(nextEvent.start).getHours() * 60 + new Date(nextEvent.start).getMinutes())}</span> : <span className="text-[11px] text-fg-subtle">{viewingToday ? "No upcoming events" : "No events on this day"}</span>)}
      </div>
      <EventEditorModal eventId={selectedEventId} onClose={() => setSelectedEventId(null)} onFocusTask={onFocusTask} />
    </section>
  );
}

function EventPill({ event, allDay, onClick }: { event: CalendarEvent; allDay?: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[11px] text-fg" style={{ background: blockColor(event.colorIndex) }}>
    <CalendarEventIdentity event={event} size="small" />{event.title}<span className="ml-auto text-fg-muted">{allDay ? "All day" : ""}</span>
  </button>;
}

function nextEventStatus(event: CalendarEvent, now: Date) {
  const start = new Date(event.start);
  const end = new Date(start.getTime() + event.durationMinutes * 60_000);
  if (start <= now && end > now) return `In progress · ends ${format(end, "HH:mm")}`;
  const minutes = Math.max(0, Math.ceil((start.getTime() - now.getTime()) / 60_000));
  if (minutes < 60) return `Starts in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `Starts in ${hours}h${remainder ? ` ${remainder}m` : ""}`;
}
