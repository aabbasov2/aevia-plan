"use client";

import { useDroppable } from "@dnd-kit/core";
import { addDays, format, isSameDay } from "date-fns";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { weekStart, formatHm } from "@/lib/time";
import { CalendarBlock } from "./CalendarBlock";

const HOUR_HEIGHT = 48;
const START_HOUR = 8;
const END_HOUR = 20;
const HOURS = END_HOUR - START_HOUR;
const DAYS = 5;
const SLOT_MINUTES = 30;
const WORK_START_HOUR = 9;
const WORK_END_HOUR = 18;
const LUNCH_START_HOUR = 13;

export function CalendarGrid({ weekOffset = 0 }: { weekOffset?: number }) {
  const events = useStore((s) => s.events);
  const ws = useMemo(() => addDays(weekStart(), weekOffset * 7), [weekOffset]);
  const today = new Date();

  const eventsByDay: Array<Array<{ minutesInDay: number; event: (typeof events)[number] }>> =
    Array.from({ length: DAYS }, () => []);

  for (const e of events) {
    const d = new Date(e.start);
    for (let i = 0; i < DAYS; i++) {
      const day = addDays(ws, i);
      if (
        d.getFullYear() === day.getFullYear() &&
        d.getMonth() === day.getMonth() &&
        d.getDate() === day.getDate()
      ) {
        eventsByDay[i].push({ minutesInDay: d.getHours() * 60 + d.getMinutes(), event: e });
      }
    }
  }
  eventsByDay.forEach((dayEvents) =>
    dayEvents.sort((a, b) => a.minutesInDay - b.minutesInDay)
  );

  return (
    <div className="card scroll-smooth overflow-x-auto shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      <div className="min-w-[820px] overflow-hidden xl:min-w-0">
      {/* Header row */}
      <div className="grid grid-cols-[64px_repeat(5,1fr)] border-b border-[var(--border-strong)] bg-[var(--surface-2)]/70">
        <div className="sticky left-0 z-30 border-r border-[var(--border)] bg-[var(--surface-2)]" />
        {Array.from({ length: DAYS }).map((_, i) => {
          const day = addDays(ws, i);
          const isToday = isSameDay(day, today);
          return (
            <div
              key={i}
              className={`border-l border-[var(--border)] px-4 py-3 text-center ${
                isToday ? "bg-[var(--gold-soft)]" : ""
              }`}
            >
              <div className="wordmark text-[10px] text-fg-muted">
                {format(day, "EEE")}
              </div>
              <div className="mt-1 flex justify-center">
                <span
                  className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-[17px] ${
                    isToday ? "bg-[var(--gold)] text-[#0b0b0d]" : "text-fg"
                  }`}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {format(day, "d")}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Body */}
      <div className="grid grid-cols-[64px_repeat(5,1fr)]" style={{ height: HOURS * HOUR_HEIGHT }}>
        {/* Time gutter */}
        <div className="sticky left-0 z-30 border-r border-[var(--border)] bg-[var(--surface)]">
          {Array.from({ length: HOURS + 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 -translate-y-1/2 pr-3 text-right text-[10.5px] text-fg-subtle"
              style={{ top: i * HOUR_HEIGHT, fontVariantNumeric: "tabular-nums" }}
            >
              {formatHm((START_HOUR + i) * 60)}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {Array.from({ length: DAYS }).map((_, dayIdx) => (
          <DayColumn
            key={dayIdx}
            dayIndex={dayIdx}
            weekStartMs={ws.getTime()}
            isToday={isSameDay(addDays(ws, dayIdx), today)}
            events={eventsByDay[dayIdx]}
          />
        ))}
      </div>
      </div>
    </div>
  );
}

function DayColumn({
  dayIndex,
  weekStartMs,
  isToday,
  events,
}: {
  dayIndex: number;
  weekStartMs: number;
  isToday: boolean;
  events: Array<{ minutesInDay: number; event: import("@/lib/types").CalendarEvent }>;
}) {
  const rows = (HOURS * 60) / SLOT_MINUTES;
  return (
    <div className={`relative border-l border-[var(--border)] ${isToday ? "bg-[var(--gold-soft)]/20" : ""}`}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 bg-black/10"
        style={{ height: (WORK_START_HOUR - START_HOUR) * HOUR_HEIGHT }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bg-black/10"
        style={{
          top: (WORK_END_HOUR - START_HOUR) * HOUR_HEIGHT,
          bottom: 0,
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 z-[1] border-y border-dashed border-[var(--border-strong)] bg-[var(--surface-2)]/75"
        style={{
          top: (LUNCH_START_HOUR - START_HOUR) * HOUR_HEIGHT,
          height: HOUR_HEIGHT,
        }}
      >
        {dayIndex === 0 && (
          <span className="absolute left-2 top-1 text-[9px] uppercase tracking-[0.16em] text-fg-subtle">
            Lunch
          </span>
        )}
      </div>

      {/* 30-minute gridlines */}
      {Array.from({ length: HOURS * 2 }).map((_, i) => (
        <div
          key={i}
          className={`pointer-events-none absolute left-0 right-0 border-t ${
            i % 2 === 0 ? "border-[var(--border)]" : "border-dashed border-white/[0.025]"
          }`}
          style={{ top: (i * HOUR_HEIGHT) / 2 }}
        />
      ))}

      {/* Drop slots (30-min granularity) */}
      {Array.from({ length: rows }).map((_, i) => (
        <DropSlot
          key={i}
          dayIndex={dayIndex}
          startMinutes={START_HOUR * 60 + i * SLOT_MINUTES}
          weekStartMs={weekStartMs}
          top={(i * SLOT_MINUTES * HOUR_HEIGHT) / 60}
        />
      ))}

      {/* Events */}
      {events.map(({ event, minutesInDay }) => (
        <CalendarBlock key={event.id} event={event} startMinutesInDay={minutesInDay} />
      ))}

      {isToday && <CurrentTimeLine />}
    </div>
  );
}

function CurrentTimeLine() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes < START_HOUR * 60 || minutes > END_HOUR * 60) return null;
  const top = ((minutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top }}>
      <span className="-ml-1 h-2 w-2 rounded-full bg-[var(--gold)] shadow-[0_0_0_3px_var(--gold-soft)]" />
      <span className="h-px flex-1 bg-[var(--gold)]/70" />
    </div>
  );
}

function DropSlot({
  dayIndex,
  startMinutes,
  weekStartMs,
  top,
}: {
  dayIndex: number;
  startMinutes: number;
  weekStartMs: number;
  top: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${dayIndex}-${startMinutes}-${weekStartMs}`,
  });
  return (
    <div
      ref={setNodeRef}
      className="absolute left-0 right-0 z-[2] mx-1 rounded-sm"
      style={{
        top,
        height: (SLOT_MINUTES * HOUR_HEIGHT) / 60,
        background: isOver ? "var(--gold-soft)" : "transparent",
        transition: "background 120ms ease",
      }}
    />
  );
}
