"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  addDays,
  differenceInCalendarDays,
  format,
  isSameDay,
  startOfDay,
} from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CALENDAR_DROP_SLOT_MINUTES,
  CALENDAR_HOUR_HEIGHT,
  calendarVisualDurationMinutes,
  type CalendarView,
} from "@/lib/calendar-layout";
import { useStore } from "@/lib/store";
import { formatHm, weekStart } from "@/lib/time";
import type { CalendarEvent } from "@/lib/types";
import { CalendarBlock } from "./CalendarBlock";
import { MonthCalendarGrid } from "./MonthCalendarGrid";

type DayEvent = {
  minutesInDay: number;
  event: CalendarEvent;
};

type PositionedDayEvent = DayEvent & {
  lane: number;
  laneCount: number;
};

export function CalendarGrid({
  anchorDate,
  view,
  onEventOpen,
  selectedEventIds,
  onEventSelect,
  onCreateEvent,
  pasteTargetMs,
  onSelectSlot,
}: {
  anchorDate: Date;
  view: CalendarView;
  onEventOpen: (eventId: string) => void;
  selectedEventIds: ReadonlySet<string>;
  onEventSelect: (eventId: string, additive: boolean) => void;
  onCreateEvent: (start: Date) => void;
  pasteTargetMs: number | null;
  onSelectSlot: (start: Date) => void;
}) {
  if (view === "month") {
    return (
      <MonthCalendarGrid
        anchorDate={anchorDate}
        selectedEventIds={selectedEventIds}
        onEventSelect={onEventSelect}
        onEventOpen={onEventOpen}
      />
    );
  }

  return (
    <TimeCalendarGrid
      anchorDate={anchorDate}
      view={view}
      onEventOpen={onEventOpen}
      selectedEventIds={selectedEventIds}
      onEventSelect={onEventSelect}
      onCreateEvent={onCreateEvent}
      pasteTargetMs={pasteTargetMs}
      onSelectSlot={onSelectSlot}
    />
  );
}

function TimeCalendarGrid({
  anchorDate,
  view,
  onEventOpen,
  selectedEventIds,
  onEventSelect,
  onCreateEvent,
  pasteTargetMs,
  onSelectSlot,
}: {
  anchorDate: Date;
  view: Exclude<CalendarView, "month">;
  onEventOpen: (eventId: string) => void;
  selectedEventIds: ReadonlySet<string>;
  onEventSelect: (eventId: string, additive: boolean) => void;
  onCreateEvent: (start: Date) => void;
  pasteTargetMs: number | null;
  onSelectSlot: (start: Date) => void;
}) {
  const events = useStore((state) => state.events);
  const preferences = useStore((state) => state.plannerPreferences);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [hourHeight, setHourHeight] = useState(60);
  const ws = useMemo(() => weekStart(anchorDate), [anchorDate]);
  const visibleDates = useMemo(
    () =>
      view === "day"
        ? [startOfDay(anchorDate)]
        : Array.from({ length: 7 }, (_, index) => addDays(ws, index)),
    [anchorDate, view, ws]
  );
  const today = new Date();

  const eventsByDay = useMemo(() => {
    const grouped: DayEvent[][] = visibleDates.map(() => []);
    for (const event of events) {
      const eventStart = new Date(event.start);
      const dayIndex = visibleDates.findIndex((day) => isSameDay(eventStart, day));
      if (dayIndex === -1) continue;
      grouped[dayIndex].push({
        minutesInDay: eventStart.getHours() * 60 + eventStart.getMinutes(),
        event,
      });
    }
    grouped.forEach((dayEvents) =>
      dayEvents.sort((first, second) => first.minutesInDay - second.minutesInDay)
    );
    return grouped;
  }, [events, visibleDates]);

  const focusRange = useMemo(() => {
    let startMinutes = preferences.workStartMinutes;
    let endMinutes = preferences.workEndMinutes;

    for (const dayEvents of eventsByDay) {
      for (const { event, minutesInDay } of dayEvents) {
        startMinutes = Math.min(startMinutes, minutesInDay);
        endMinutes = Math.max(
          endMinutes,
          Math.min(24 * 60, minutesInDay + event.durationMinutes)
        );
      }
    }

    return {
      startMinutes: Math.max(0, Math.floor(startMinutes / 15) * 15),
      endMinutes: Math.min(24 * 60, Math.ceil(endMinutes / 15) * 15),
    };
  }, [eventsByDay, preferences.workEndMinutes, preferences.workStartMinutes]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const fitSchedulingRange = () => {
      const headerHeight = headerRef.current?.offsetHeight ?? 56;
      const availableHeight = Math.max(
        300,
        scrollContainer.clientHeight - headerHeight - 18
      );
      const focusHours = Math.max(
        1,
        (focusRange.endMinutes - focusRange.startMinutes) / 60
      );
      const fittedHourHeight = Math.max(
        18,
        Math.min(CALENDAR_HOUR_HEIGHT, availableHeight / focusHours)
      );

      setHourHeight((current) =>
        Math.abs(current - fittedHourHeight) > 0.1 ? fittedHourHeight : current
      );
      window.requestAnimationFrame(() => {
        scrollContainer.scrollTop = Math.max(
          0,
          (focusRange.startMinutes / 60) * fittedHourHeight - 8
        );
      });
    };

    fitSchedulingRange();
    const observer = new ResizeObserver(fitSchedulingRange);
    observer.observe(scrollContainer);
    return () => observer.disconnect();
  }, [focusRange.endMinutes, focusRange.startMinutes, view]);

  const positionedEventsByDay = useMemo(
    () =>
      eventsByDay.map((dayEvents) =>
        positionOverlappingEvents(dayEvents, hourHeight)
      ),
    [eventsByDay, hourHeight]
  );
  const startHour = 0;
  const hours = 24;
  const gridTemplateColumns = `64px repeat(${visibleDates.length}, minmax(0, 1fr))`;

  return (
    <div
      ref={scrollContainerRef}
      className="card min-h-[520px] scroll-smooth overflow-auto shadow-[var(--calendar-shadow)]"
      style={{ height: "clamp(520px, calc(100vh - 230px), 760px)" }}
    >
      <div className={view === "day" ? "min-w-[520px]" : "calendar-week-grid"}>
        <div
          ref={headerRef}
          className="sticky top-0 z-40 grid border-b border-[var(--border-strong)] bg-[var(--surface-2)]/95 backdrop-blur-sm"
          style={{ gridTemplateColumns }}
        >
          <div className="sticky left-0 z-30 flex items-center justify-center border-r border-[var(--border)] bg-[var(--surface-2)] px-1 text-center text-[8px] uppercase tracking-[0.12em] text-fg-subtle">
            {formatHm(focusRange.startMinutes)}–{formatHm(focusRange.endMinutes)}
          </div>
          {visibleDates.map((day) => {
            const isToday = isSameDay(day, today);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            return (
              <div
                key={day.toISOString()}
                className={`border-l border-[var(--border)] px-2 py-3 text-center ${
                  isToday ? "bg-[var(--gold-soft)]" : ""
                } ${isWeekend ? "bg-[var(--calendar-weekend)]" : ""}`}
              >
                <div className="wordmark text-[10px] text-fg-muted">
                  {format(day, view === "day" ? "EEEE" : "EEE")}
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

        <div
          className="grid"
          style={{ height: hours * hourHeight, gridTemplateColumns }}
        >
          <div className="sticky left-0 z-30 border-r border-[var(--border)] bg-[var(--surface)]">
            {Array.from({ length: hours + 1 }).map((_, index) => (
              <div
                key={index}
                className="absolute left-0 right-0 -translate-y-1/2 pr-3 text-right text-[10.5px] text-fg-subtle"
                style={{
                  top: index * hourHeight,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatHm((startHour + index) * 60)}
              </div>
            ))}
          </div>

          {visibleDates.map((day, visibleDayIndex) => (
            <DayColumn
              key={day.toISOString()}
              dayIndex={differenceInCalendarDays(day, ws)}
              weekStartMs={ws.getTime()}
              isToday={isSameDay(day, today)}
              isWeekend={day.getDay() === 0 || day.getDay() === 6}
              events={positionedEventsByDay[visibleDayIndex]}
              startHour={startHour}
              hours={hours}
              hourHeight={hourHeight}
              workStartMinutes={preferences.workStartMinutes}
              workEndMinutes={preferences.workEndMinutes}
              onEventOpen={onEventOpen}
              selectedEventIds={selectedEventIds}
              onEventSelect={onEventSelect}
              onCreateEvent={onCreateEvent}
              pasteTargetMs={pasteTargetMs}
              onSelectSlot={onSelectSlot}
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
  isWeekend,
  events,
  startHour,
  hours,
  hourHeight,
  workStartMinutes,
  workEndMinutes,
  onEventOpen,
  selectedEventIds,
  onEventSelect,
  onCreateEvent,
  pasteTargetMs,
  onSelectSlot,
}: {
  dayIndex: number;
  weekStartMs: number;
  isToday: boolean;
  isWeekend: boolean;
  events: PositionedDayEvent[];
  startHour: number;
  hours: number;
  hourHeight: number;
  workStartMinutes: number;
  workEndMinutes: number;
  onEventOpen: (eventId: string) => void;
  selectedEventIds: ReadonlySet<string>;
  onEventSelect: (eventId: string, additive: boolean) => void;
  onCreateEvent: (start: Date) => void;
  pasteTargetMs: number | null;
  onSelectSlot: (start: Date) => void;
}) {
  const rows = (hours * 60) / CALENDAR_DROP_SLOT_MINUTES;
  const gridStartMinutes = startHour * 60;
  const beforeWorkHeight = Math.max(
    0,
    ((workStartMinutes - gridStartMinutes) / 60) * hourHeight
  );
  const afterWorkTop = Math.max(
    0,
    ((workEndMinutes - gridStartMinutes) / 60) * hourHeight
  );

  return (
    <div className={`relative border-l border-[var(--border)] ${isToday ? "bg-[var(--gold-soft)]/20" : ""} ${isWeekend ? "bg-[var(--calendar-weekend)]" : ""}`}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 bg-[var(--calendar-offhours)]"
        style={{ height: beforeWorkHeight }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bg-[var(--calendar-offhours)]"
        style={{ top: afterWorkTop, bottom: 0 }}
      />

      {Array.from({ length: hours * 2 }).map((_, index) => (
        <div
          key={index}
          className={`pointer-events-none absolute left-0 right-0 border-t ${
            index % 2 === 0
              ? "border-[var(--border)]"
              : "border-dashed border-[var(--grid-half)]"
          }`}
          style={{ top: (index * hourHeight) / 2 }}
        />
      ))}

      {Array.from({ length: rows }).map((_, index) => {
        const startMinutes = gridStartMinutes + index * CALENDAR_DROP_SLOT_MINUTES;
        const endMinutes = startMinutes + CALENDAR_DROP_SLOT_MINUTES;
        const isOccupied = events.some(
          ({ event, minutesInDay }) =>
            startMinutes < minutesInDay + event.durationMinutes &&
            endMinutes > minutesInDay
        );
        return (
          <DropSlot
            key={index}
            dayIndex={dayIndex}
            startMinutes={startMinutes}
            weekStartMs={weekStartMs}
            top={(index * CALENDAR_DROP_SLOT_MINUTES * hourHeight) / 60}
            hourHeight={hourHeight}
            canCreate={!isOccupied}
            selected={
              pasteTargetMs ===
              slotStartDate(weekStartMs, dayIndex, startMinutes).getTime()
            }
            onSelectSlot={onSelectSlot}
            onCreateEvent={onCreateEvent}
          />
        );
      })}

      {events.map(({ event, minutesInDay, lane, laneCount }) => (
        <CalendarBlock
          key={event.id}
          event={event}
          startMinutesInDay={minutesInDay}
          calendarStartMinutes={gridStartMinutes}
          lane={lane}
          laneCount={laneCount}
          hourHeight={hourHeight}
          selected={selectedEventIds.has(event.id)}
          onSelect={onEventSelect}
          onOpen={onEventOpen}
        />
      ))}

      {isToday && (
        <CurrentTimeLine
          startMinutes={gridStartMinutes}
          endMinutes={(startHour + hours) * 60}
          hourHeight={hourHeight}
        />
      )}
    </div>
  );
}

function positionOverlappingEvents(
  events: DayEvent[],
  hourHeight: number
): PositionedDayEvent[] {
  const positioned: PositionedDayEvent[] = [];
  let cluster: Array<DayEvent & { lane: number }> = [];
  let clusterEnd = -1;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const laneCount = Math.max(...cluster.map((item) => item.lane)) + 1;
    positioned.push(...cluster.map((item) => ({ ...item, laneCount })));
    cluster = [];
    clusterEnd = -1;
  };

  const laneEnds: number[] = [];
  for (const item of events) {
    const start = item.minutesInDay;
    const end =
      start + calendarVisualDurationMinutes(item.event.durationMinutes, hourHeight);

    if (cluster.length > 0 && start >= clusterEnd) {
      flushCluster();
      laneEnds.length = 0;
    }

    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = end;
    cluster.push({ ...item, lane });
    clusterEnd = Math.max(clusterEnd, end);
  }

  flushCluster();
  return positioned;
}

function CurrentTimeLine({
  startMinutes,
  endMinutes,
  hourHeight,
}: {
  startMinutes: number;
  endMinutes: number;
  hourHeight: number;
}) {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes < startMinutes || minutes > endMinutes) return null;
  const top = ((minutes - startMinutes) / 60) * hourHeight;
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
  hourHeight,
  canCreate,
  selected,
  onSelectSlot,
  onCreateEvent,
}: {
  dayIndex: number;
  startMinutes: number;
  weekStartMs: number;
  top: number;
  hourHeight: number;
  canCreate: boolean;
  selected: boolean;
  onSelectSlot: (start: Date) => void;
  onCreateEvent: (start: Date) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${dayIndex}-${startMinutes}-${weekStartMs}`,
  });
  return (
    <div
      ref={setNodeRef}
      className={`absolute left-0 right-0 mx-1 rounded-sm ${isOver ? "z-20" : "z-[2]"} ${canCreate ? "cursor-cell" : ""}`}
      onClick={(event) => {
        if (!canCreate) return;
        event.stopPropagation();
        onSelectSlot(slotStartDate(weekStartMs, dayIndex, startMinutes));
      }}
      onDoubleClick={(event) => {
        if (!canCreate) return;
        event.preventDefault();
        event.stopPropagation();
        onCreateEvent(slotStartDate(weekStartMs, dayIndex, startMinutes));
      }}
      title={canCreate ? `Double-click to add an event at ${formatHm(startMinutes)}` : undefined}
      style={{
        top,
        height: (CALENDAR_DROP_SLOT_MINUTES * hourHeight) / 60,
        background: isOver || selected ? "var(--gold-soft)" : "transparent",
        boxShadow: selected ? "inset 0 0 0 1px var(--gold)" : undefined,
        transition: "background 120ms ease",
      }}
    >
      {isOver && (
        <span className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 rounded bg-[var(--surface-2)] px-1 text-[8px] leading-[12px] text-gold shadow-sm">
          {formatHm(startMinutes)}
        </span>
      )}
    </div>
  );
}

function slotStartDate(
  weekStartMs: number,
  dayIndex: number,
  startMinutes: number
) {
  const start = addDays(new Date(weekStartMs), dayIndex);
  start.setHours(0, 0, 0, 0);
  start.setMinutes(startMinutes);
  return start;
}
