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

  return (
    <div className="card overflow-hidden">
      {/* Header row */}
      <div className="grid grid-cols-[56px_repeat(5,1fr)] border-b border-[var(--border)]">
        <div />
        {Array.from({ length: DAYS }).map((_, i) => {
          const day = addDays(ws, i);
          const isToday = isSameDay(day, today);
          return (
            <div
              key={i}
              className="border-l border-[var(--border)] px-4 py-3 text-center"
            >
              <div className="wordmark text-[10px] text-fg-muted">
                {format(day, "EEE")}
              </div>
              <div
                className={`mt-1 text-[18px] ${isToday ? "text-gold" : "text-fg"}`}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {format(day, "d")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Body */}
      <div className="grid grid-cols-[56px_repeat(5,1fr)]" style={{ height: HOURS * HOUR_HEIGHT }}>
        {/* Time gutter */}
        <div className="relative">
          {Array.from({ length: HOURS + 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 -translate-y-1/2 pr-2 text-right text-[10.5px] text-fg-subtle"
              style={{ top: i * HOUR_HEIGHT, fontVariantNumeric: "tabular-nums" }}
            >
              {formatHm((START_HOUR + i) * 60)}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {Array.from({ length: DAYS }).map((_, dayIdx) => (
          <DayColumn key={dayIdx} dayIndex={dayIdx} events={eventsByDay[dayIdx]} />
        ))}
      </div>
    </div>
  );
}

function DayColumn({
  dayIndex,
  events,
}: {
  dayIndex: number;
  events: Array<{ minutesInDay: number; event: import("@/lib/types").CalendarEvent }>;
}) {
  const rows = (HOURS * 60) / SLOT_MINUTES;
  return (
    <div className="relative border-l border-[var(--border)]">
      {/* Hour gridlines */}
      {Array.from({ length: HOURS }).map((_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-t border-[var(--border)]"
          style={{ top: i * HOUR_HEIGHT }}
        />
      ))}

      {/* Drop slots (30-min granularity) */}
      {Array.from({ length: rows }).map((_, i) => (
        <DropSlot
          key={i}
          dayIndex={dayIndex}
          startMinutes={START_HOUR * 60 + i * SLOT_MINUTES}
          top={(i * SLOT_MINUTES * HOUR_HEIGHT) / 60}
        />
      ))}

      {/* Events */}
      {events.map(({ event, minutesInDay }) => (
        <CalendarBlock key={event.id} event={event} startMinutesInDay={minutesInDay} />
      ))}
    </div>
  );
}

function DropSlot({
  dayIndex,
  startMinutes,
  top,
}: {
  dayIndex: number;
  startMinutes: number;
  top: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${dayIndex}-${startMinutes}`,
  });
  return (
    <div
      ref={setNodeRef}
      className="absolute left-0 right-0 z-0"
      style={{
        top,
        height: (SLOT_MINUTES * HOUR_HEIGHT) / 60,
        background: isOver ? "var(--gold-soft)" : "transparent",
        transition: "background 120ms ease",
      }}
    />
  );
}
