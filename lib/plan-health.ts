import { addDays, differenceInMinutes } from "date-fns";
import type { CalendarEvent, PlanHealth, Task } from "./types";
import { weekStart } from "./time";

const WORKING_HOURS_PER_DAY = 8;

export function derivePlanHealth(
  tasks: Task[],
  events: CalendarEvent[],
  now = new Date()
): PlanHealth {
  const ws = weekStart(now);
  const weekEnd = addDays(ws, 5); // through Fri end (Mon-Fri window)
  weekEnd.setHours(18, 0, 0, 0);

  // Active tasks that need scheduling this week (deadline within this window and not completed)
  const activeTasks = tasks.filter(
    (t) =>
      !t.completed &&
      t.deadline &&
      new Date(t.deadline) >= now &&
      new Date(t.deadline) <= weekEnd
  );

  const scheduledMinutesByTask = new Map<string, number>();
  for (const e of events) {
    if (e.taskId) {
      scheduledMinutesByTask.set(
        e.taskId,
        (scheduledMinutesByTask.get(e.taskId) ?? 0) + e.durationMinutes
      );
    }
  }

  let remainingMinutes = 0;
  for (const t of activeTasks) {
    const done = scheduledMinutesByTask.get(t.id) ?? 0;
    remainingMinutes += Math.max(0, t.durationMinutes - done);
  }

  // Total available minutes = working hours per day between now and Fri end, minus non-task events (meetings/personal).
  const workingWindowMinutes = Math.max(
    0,
    differenceInMinutes(weekEnd, now)
  );
  // Rough estimate: cap available to (business days remaining * 8h)
  const daysRemaining = Math.max(1, Math.ceil(differenceInMinutes(weekEnd, now) / (24 * 60)));
  const capacityMinutes = daysRemaining * WORKING_HOURS_PER_DAY * 60;

  const busyMinutes = events
    .filter((e) => e.kind !== "task" && new Date(e.start) >= now && new Date(e.start) < weekEnd)
    .reduce((sum, e) => sum + e.durationMinutes, 0);

  const alreadyScheduledTaskMinutes = events
    .filter((e) => e.kind === "task" && new Date(e.start) >= now && new Date(e.start) < weekEnd)
    .reduce((sum, e) => sum + e.durationMinutes, 0);

  const availableMinutes = Math.max(
    0,
    Math.min(workingWindowMinutes, capacityMinutes) - busyMinutes - alreadyScheduledTaskMinutes
  );

  const remainingHours = round1(remainingMinutes / 60);
  const availableHours = round1(availableMinutes / 60);
  const scheduledHours = round1(alreadyScheduledTaskMinutes / 60);

  if (remainingHours > availableHours) {
    return {
      state: "wont-fit",
      shortfallHours: round1(remainingHours - availableHours),
      deadlineLabel: "Friday",
    };
  }
  if (remainingHours > 0 && scheduledHours < remainingHours * 0.5) {
    return {
      state: "needs-attention",
      remainingHours,
      scheduledHours,
      unscheduledHours: round1(remainingHours - scheduledHours),
    };
  }
  return {
    state: "on-track",
    remainingHours: Math.max(remainingHours, 0),
    availableHours,
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function deriveMetrics(
  tasks: Task[],
  events: CalendarEvent[],
  now = new Date()
) {
  const health = derivePlanHealth(tasks, events, now);
  const ws = weekStart(now);
  const weekEnd = addDays(ws, 5);
  weekEnd.setHours(18, 0, 0, 0);

  const scheduledMinutes = events
    .filter((e) => new Date(e.start) >= now && new Date(e.start) < weekEnd)
    .reduce((s, e) => s + e.durationMinutes, 0);

  const remainingHours =
    health.state === "wont-fit"
      ? 0
      : "remainingHours" in health
      ? health.remainingHours
      : 0;

  const availableHours =
    health.state === "on-track"
      ? health.availableHours
      : health.state === "needs-attention"
      ? Math.max(0, health.remainingHours - health.scheduledHours)
      : 0;

  return {
    availableHours: Math.round((availableHours || 0) * 10) / 10,
    scheduledHours: Math.round((scheduledMinutes / 60) * 10) / 10,
    remainingHours: remainingHours || 0,
    health,
  };
}
