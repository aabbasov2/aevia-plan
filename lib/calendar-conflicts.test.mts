import assert from "node:assert/strict";
import test from "node:test";
import { calendarEventInterval, findCalendarOverlaps, findCalendarTransitionWarnings } from "./calendar-conflicts.ts";
import type { CalendarEvent } from "./types.ts";

function event(id: string, start: string, durationMinutes: number, overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return { id, title: id, start, durationMinutes, kind: "meeting", ...overrides };
}

test("interval detection handles partial, contained, and identical ranges once", () => {
  const base = "2026-10-19T09:00:00+03:00";
  const start = new Date(base).getTime();
  const overlaps = findCalendarOverlaps([
    event("a", base, 60),
    event("b", new Date(start + 30 * 60_000).toISOString(), 60),
    event("c", new Date(start + 15 * 60_000).toISOString(), 15),
    event("d", base, 60),
  ]);
  assert.equal(overlaps.length, 5);
  assert.ok(overlaps.every((overlap) => overlap.start < overlap.end));
  assert.equal(new Set(overlaps.map((overlap) => overlap.key)).size, overlaps.length);
});

test("adjacent, zero-length, invalid, cancelled, free, and declined events do not conflict", () => {
  const base = "2026-10-19T09:00:00+03:00";
  const startMs = new Date(base).getTime();
  const valid = event("valid", base, 60);
  const overlaps = findCalendarOverlaps([
    valid,
    event("adjacent", new Date(startMs + 60 * 60_000).toISOString(), 30),
    event("zero", base, 0),
    event("invalid", "not-a-date", 30),
    event("cancelled", base, 30, { cancelled: true }),
    event("free", base, 30, { availability: "free" }),
    event("declined", base, 30, { responseStatus: "declined" }),
  ]);
  assert.deepEqual(overlaps, []);
});

test("classifies meeting, task, and protected-focus conflicts without moving commitments", () => {
  const start = "2026-10-19T09:00:00+03:00";
  const meeting = event("meeting", start, 60, { kind: "meeting" });
  const meeting2 = event("meeting2", start, 60, { kind: "meeting" });
  const task = event("task", start, 60, { kind: "task", taskId: "t1", origin: "aevia" });
  const focus = event("focus", start, 60, { kind: "focus" });
  const result = findCalendarOverlaps([meeting, meeting2, task, focus]);
  const byPair = (first: string, second: string) => result.find((item) =>
    new Set([item.first.id, item.second.id]).size === 2 && [item.first.id, item.second.id].includes(first) && [item.first.id, item.second.id].includes(second)
  );
  assert.equal(byPair("meeting", "meeting2")?.type, "meeting-meeting");
  assert.equal(byPair("meeting", "meeting2")?.severity, "hard");
  assert.equal(byPair("meeting", "task")?.type, "meeting-task");
  assert.equal(byPair("focus", "task")?.type, "protected-time");
  assert.equal(byPair("focus", "task")?.severity, "actionable");
});

test("all-day availability and invitation status follow their explicit fields", () => {
  const busyTask = event("task", "2026-10-19T12:00:00+03:00", 60, { kind: "task", taskId: "t1", origin: "aevia" });
  const freeDay = event("free-day", "2026-10-19T10:00:00+03:00", 0, { allDay: true, availability: "free" });
  const busyDay = event("busy-day", "2026-10-19T10:00:00+03:00", 0, { allDay: true, availability: "busy" });
  const tentative = event("tentative", "2026-10-19T12:00:00+03:00", 30, { responseStatus: "tentative" });
  assert.equal(findCalendarOverlaps([freeDay, busyTask]).length, 0);
  assert.equal(findCalendarOverlaps([busyDay, busyTask]).length, 1);
  assert.equal(findCalendarOverlaps([tentative, busyTask]).length, 1);
});

test("expands recurring event instances inside the requested calendar window", () => {
  const recurring = event("series", "2026-10-19T09:00:00Z", 60, {
    recurrence: { frequency: "weekly", daysOfWeek: [1, 3] },
  });
  const task = event("task", "2026-10-21T09:30:00Z", 30, { kind: "task", taskId: "t1", origin: "aevia" });
  const overlaps = findCalendarOverlaps([recurring, task], Date.parse("2026-10-19T00:00:00Z"), Date.parse("2026-10-24T00:00:00Z"));
  assert.equal(overlaps.length, 1);
  assert.equal(overlaps[0].first.id, "series");
  assert.equal(overlaps[0].first.start, recurring.start);
  const occurrence = new Date(overlaps[0].firstOccurrenceStart);
  assert.equal(occurrence.getDate(), 21);
  assert.equal(occurrence.getHours(), new Date(recurring.start).getHours());
});

test("all-day intervals follow local calendar days across DST", () => {
  const previousTimeZone = process.env.TZ;
  process.env.TZ = "Europe/Tallinn";
  try {
    const allDay = event("dst-day", "2026-10-25T00:00:00+03:00", 0, { allDay: true });
    const interval = calendarEventInterval(allDay);
    assert.ok(interval);
    assert.equal(interval.end - interval.start, 25 * 60 * 60_000);
  } finally {
    if (previousTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimeZone;
  }
});

test("uses absolute instants across DST offset transitions and reports short gaps separately", () => {
  const before = event("before", "2026-10-25T02:30:00+03:00", 30);
  const after = event("after", "2026-10-25T02:00:00+02:00", 30);
  assert.deepEqual(findCalendarOverlaps([before, after]), []);
  const warning = findCalendarTransitionWarnings([
    event("first", "2026-10-19T09:00:00Z", 30),
    event("second", "2026-10-19T09:35:00Z", 30),
  ], 10);
  assert.equal(warning.length, 1);
  assert.equal(warning[0].gapMinutes, 5);
});
