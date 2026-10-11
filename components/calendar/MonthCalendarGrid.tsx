"use client";

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { blockColor } from "@/lib/projects";
import { useStore } from "@/lib/store";
import { formatHm } from "@/lib/time";
import { CalendarEventIdentity } from "@/components/calendar/CalendarEventIdentity";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthCalendarGrid({
  anchorDate,
  selectedEventIds,
  onEventSelect,
  onEventOpen,
}: {
  anchorDate: Date;
  selectedEventIds: ReadonlySet<string>;
  onEventSelect: (eventId: string, additive: boolean) => void;
  onEventOpen: (eventId: string) => void;
}) {
  const events = useStore((state) => state.events);
  const today = new Date();
  const firstDay = startOfWeek(startOfMonth(anchorDate), { weekStartsOn: 1 });
  const lastDay = endOfWeek(endOfMonth(anchorDate), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: firstDay, end: lastDay });

  return (
    <div className="card overflow-hidden shadow-[var(--calendar-shadow)]">
      <div className="grid min-w-[760px] grid-cols-7 border-b border-[var(--border-strong)] bg-[var(--surface-2)]">
        {WEEKDAYS.map((weekday, index) => (
          <div
            key={weekday}
            className={`border-l border-[var(--border)] px-2 py-3 text-center first:border-l-0 ${
              index >= 5 ? "bg-[var(--calendar-weekend)]" : ""
            }`}
          >
            <span className="wordmark text-[10px] text-fg-muted">{weekday}</span>
          </div>
        ))}
      </div>

      <div className="grid min-w-[760px] grid-cols-7">
        {days.map((day, index) => {
          const dayEvents = events
            .filter((event) => isSameDay(new Date(event.start), day))
            .sort(
              (first, second) =>
                new Date(first.start).getTime() - new Date(second.start).getTime()
            );
          const isToday = isSameDay(day, today);
          const isOutsideMonth = !isSameMonth(day, anchorDate);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[116px] border-b border-l border-[var(--border)] p-1.5 first:border-l-0 ${
                isWeekend ? "bg-[var(--calendar-weekend)]" : ""
              } ${isOutsideMonth ? "opacity-45" : ""}`}
            >
              <div className="mb-1.5 flex justify-end">
                <span
                  className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11px] ${
                    isToday ? "bg-[var(--gold)] font-semibold text-[#0b0b0d]" : "text-fg-muted"
                  }`}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {format(day, "d")}
                </span>
              </div>

              <div className="space-y-1">
                {dayEvents.slice(0, 4).map((event) => {
                  const start = new Date(event.start);
                  const startMinutes = start.getHours() * 60 + start.getMinutes();
                  return (
                    <button
                      key={event.id}
                      data-calendar-event-id={event.id}
                      className={`block w-full overflow-hidden rounded-[4px] border border-[var(--event-border)] px-1.5 py-1 text-left text-[9px] leading-[11px] text-fg shadow-[var(--event-shadow)] transition hover:border-[var(--event-border-hover)] ${
                        selectedEventIds.has(event.id)
                          ? "outline outline-2 outline-offset-1 outline-[var(--gold)]"
                          : ""
                      } ${event.cancelled ? "opacity-60 saturate-50" : ""}`}
                      style={{ background: blockColor(event.colorIndex) }}
                      onClick={(clickEvent) =>
                        onEventSelect(
                          event.id,
                          clickEvent.ctrlKey || clickEvent.metaKey || clickEvent.shiftKey
                        )
                      }
                      onDoubleClick={(clickEvent) => {
                        clickEvent.preventDefault();
                        clickEvent.stopPropagation();
                        onEventOpen(event.id);
                      }}
                      aria-selected={selectedEventIds.has(event.id)}
                      title={`${event.cancelled ? "Cancelled · " : ""}${formatHm(startMinutes)} · ${event.title} · Double-click to edit`}
                    >
                      <span className="flex min-w-0 items-center gap-1">
                        <CalendarEventIdentity event={event} size="tiny" />
                        <span className="shrink-0 font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
                          {formatHm(startMinutes)}
                        </span>
                        <span className={`min-w-0 break-words ${event.cancelled ? "line-through decoration-2" : ""}`}>
                          {event.title}
                        </span>
                      </span>
                    </button>
                  );
                })}
                {dayEvents.length > 4 && (
                  <div className="px-1 text-[9px] text-fg-subtle">+{dayEvents.length - 4} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
