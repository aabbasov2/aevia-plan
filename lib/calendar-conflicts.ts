import type { CalendarEvent } from "./types";

export type CalendarConflictType =
  | "meeting-meeting"
  | "meeting-task"
  | "task-task"
  | "protected-time"
  | "commitment-overlap";

export type CalendarConflictSeverity = "hard" | "actionable";

export type CalendarOverlap = {
  /** Stable identity for this event pair, independent of event ordering. */
  key: string;
  first: CalendarEvent;
  second: CalendarEvent;
  firstOccurrenceStart: string;
  secondOccurrenceStart: string;
  start: number;
  end: number;
  type: CalendarConflictType;
  severity: CalendarConflictSeverity;
  recommendation: string;
};

export type CalendarEventOccurrence = {
  event: CalendarEvent;
  start: number;
  end: number;
  occurrenceStart: string;
};

/** Free, declined, cancelled, malformed, and zero-length blocks do not occupy time. */
export function isBlockingCalendarEvent(event: CalendarEvent): boolean {
  if (event.cancelled || event.availability === "free" || event.responseStatus === "declined") return false;
  const start = new Date(event.start).getTime();
  return Number.isFinite(start) && (event.allDay || (Number.isFinite(event.durationMinutes) && event.durationMinutes > 0));
}

export function calendarEventInterval(event: CalendarEvent): { start: number; end: number } | null {
  if (!isBlockingCalendarEvent(event)) return null;
  const timestamp = new Date(event.start);
  if (event.allDay) {
    const start = new Date(timestamp);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start: start.getTime(), end: end.getTime() };
  }
  const start = timestamp.getTime();
  return { start, end: start + event.durationMinutes * 60_000 };
}

/** Expand recurring events into wall-clock occurrences for a finite visible range. */
export function expandCalendarEventOccurrences(
  events: CalendarEvent[],
  rangeStart: number,
  rangeEnd: number
): CalendarEventOccurrence[] {
  const finiteRange = Number.isFinite(rangeStart) && Number.isFinite(rangeEnd) && rangeStart < rangeEnd;
  const results: CalendarEventOccurrence[] = [];
  for (const event of events) {
    if (!event.recurrence || !finiteRange) {
      const interval = calendarEventInterval(event);
      if (interval && interval.end > rangeStart && interval.start < rangeEnd) results.push({ event, ...interval, occurrenceStart: event.start });
      continue;
    }
    if (!isBlockingCalendarEvent(event)) continue;
    const base = new Date(event.start);
    const baseDay = new Date(base);
    baseDay.setHours(0, 0, 0, 0);
    const cursor = new Date(rangeStart);
    cursor.setHours(0, 0, 0, 0);
    if (cursor < baseDay) cursor.setTime(baseDay.getTime());
    const recurrence = event.recurrence;
    const interval = Math.max(1, Math.floor(recurrence.interval ?? 1));
    const until = recurrence.until ? new Date(recurrence.until).getTime() : Number.POSITIVE_INFINITY;
    if (Number.isNaN(until)) continue;
    let emitted = 0;
    for (let day = new Date(cursor); day.getTime() < rangeEnd && emitted < 10_000; day.setDate(day.getDate() + 1)) {
      const dayKey = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate());
      const baseKey = Date.UTC(baseDay.getFullYear(), baseDay.getMonth(), baseDay.getDate());
      const dayIndex = Math.round((dayKey - baseKey) / 86_400_000);
      let matches = dayIndex === 0;
      if (recurrence.frequency === "daily") {
        matches ||= dayIndex >= 0 && dayIndex % interval === 0;
      } else if (recurrence.frequency === "weekly") {
        const weekStart = (key: number, weekday: number) => key - ((weekday + 6) % 7) * 86_400_000;
        const weekIndex = Math.floor((weekStart(dayKey, day.getDay()) - weekStart(baseKey, baseDay.getDay())) / (7 * 86_400_000));
        const weekdays = recurrence.daysOfWeek?.length ? recurrence.daysOfWeek : [baseDay.getDay()];
        matches ||= weekIndex >= 0 && weekIndex % interval === 0 && weekdays.includes(day.getDay());
      } else {
        const monthIndex = (day.getFullYear() - baseDay.getFullYear()) * 12 + day.getMonth() - baseDay.getMonth();
        const requestedDay = Math.max(1, Math.min(31, recurrence.dayOfMonth ?? baseDay.getDate()));
        const lastDay = new Date(day.getFullYear(), day.getMonth() + 1, 0).getDate();
        matches ||= monthIndex >= 0 && monthIndex % interval === 0 && day.getDate() === Math.min(requestedDay, lastDay);
      }
      if (!matches) continue;
      const occurrenceStart = new Date(base);
      occurrenceStart.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
      if (occurrenceStart.getTime() > until) continue;
      const instance = { ...event, start: occurrenceStart.toISOString() };
      const instanceInterval = calendarEventInterval(instance);
      if (instanceInterval && instanceInterval.end > rangeStart && instanceInterval.start < rangeEnd) {
        results.push({ event, ...instanceInterval, occurrenceStart: instance.start });
        emitted += 1;
      }
    }
  }
  return results;
}

function isFlexibleTask(event: CalendarEvent): boolean {
  return event.kind === "task" && Boolean(event.taskId) && event.origin === "aevia" && !event.locked;
}

function isProtected(event: CalendarEvent): boolean {
  return event.kind === "focus" || event.locked === true || event.kind === "lunch";
}

function classify(first: CalendarEvent, second: CalendarEvent): Pick<CalendarOverlap, "type" | "severity" | "recommendation"> {
  if (isProtected(first) || isProtected(second)) {
    const movableTask = isFlexibleTask(first) || isFlexibleTask(second);
    return {
      type: "protected-time",
      severity: movableTask ? "actionable" : "hard",
      recommendation: movableTask
        ? "Keep the protected block in place and move the flexible task."
        : "Review the protected block and the overlapping commitment; Aevia will not move either automatically.",
    };
  }
  if (first.kind === "meeting" && second.kind === "meeting") {
    return { type: "meeting-meeting", severity: "hard", recommendation: "Choose which meeting to adjust; Aevia will not move meetings automatically." };
  }
  if ((first.kind === "meeting" && second.kind === "task") || (first.kind === "task" && second.kind === "meeting")) {
    return { type: "meeting-task", severity: "actionable", recommendation: "Keep the meeting fixed and find another slot for the task." };
  }
  if (first.kind === "task" && second.kind === "task") {
    return { type: "task-task", severity: "actionable", recommendation: "Move a flexible task while preserving its duration and deadline." };
  }
  return {
    type: "commitment-overlap",
    severity: "hard",
    recommendation: "Review these commitments and choose which one to adjust.",
  };
}

/**
 * Detect genuine interval intersections using absolute instants. ISO timestamps
 * therefore compare correctly across time zones and DST offset changes.
 * Adjacent intervals are intentionally not conflicts.
 */
export function findCalendarOverlaps(
  events: CalendarEvent[],
  rangeStart = Number.NEGATIVE_INFINITY,
  rangeEnd = Number.POSITIVE_INFINITY
): CalendarOverlap[] {
  const active = expandCalendarEventOccurrences(events, rangeStart, rangeEnd)
    .filter((item) => Number.isFinite(item.end) && item.end > rangeStart && item.start < rangeEnd)
    .sort((left, right) => left.start - right.start || left.event.id.localeCompare(right.event.id));

  const byKey = new Map<string, CalendarOverlap>();
  for (let leftIndex = 0; leftIndex < active.length; leftIndex += 1) {
    const left = active[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < active.length; rightIndex += 1) {
      const right = active[rightIndex];
      if (right.start >= left.end || right.start >= rangeEnd) break;
      const start = Math.max(left.start, right.start, rangeStart);
      const end = Math.min(left.end, right.end, rangeEnd);
      if (start >= end) continue;
      const leftOrder = `${left.event.id}:${left.occurrenceStart}`;
      const rightOrder = `${right.event.id}:${right.occurrenceStart}`;
      const [first, second] = leftOrder.localeCompare(rightOrder) <= 0
        ? [left.event, right.event]
        : [right.event, left.event];
      const [firstOccurrenceStart, secondOccurrenceStart] = leftOrder.localeCompare(rightOrder) <= 0
        ? [left.occurrenceStart, right.occurrenceStart]
        : [right.occurrenceStart, left.occurrenceStart];
      const key = `${first.id}@${firstOccurrenceStart}:${second.id}@${secondOccurrenceStart}`;
      if (!byKey.has(key)) byKey.set(key, { key, first, second, firstOccurrenceStart, secondOccurrenceStart, start, end, ...classify(first, second) });
    }
  }
  return [...byKey.values()];
}

export type CalendarTransitionWarning = {
  key: string;
  first: CalendarEvent;
  second: CalendarEvent;
  gapMinutes: number;
};

/** Short gaps are planning warnings, not interval conflicts. */
export function findCalendarTransitionWarnings(
  events: CalendarEvent[],
  bufferMinutes: number,
  rangeStart = Number.NEGATIVE_INFINITY,
  rangeEnd = Number.POSITIVE_INFINITY
): CalendarTransitionWarning[] {
  if (!Number.isFinite(bufferMinutes) || bufferMinutes <= 0) return [];
  const active = expandCalendarEventOccurrences(events, rangeStart, rangeEnd)
    .filter((item) => item.end > rangeStart && item.start < rangeEnd)
    .sort((a, b) => a.start - b.start || a.event.id.localeCompare(b.event.id));
  const warnings: CalendarTransitionWarning[] = [];
  let previous = active[0];
  for (let index = 1; index < active.length; index += 1) {
    const next = active[index];
    const gapMinutes = Math.round((next.start - previous.end) / 60_000);
    if (gapMinutes >= 0 && gapMinutes < bufferMinutes) {
      warnings.push({ key: `${previous.event.id}:${previous.occurrenceStart}:${next.event.id}:${next.occurrenceStart}`, first: previous.event, second: next.event, gapMinutes });
    }
    if (next.end > previous.end) previous = next;
  }
  return warnings;
}
