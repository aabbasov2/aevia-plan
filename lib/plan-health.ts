import { addDays, addMinutes, differenceInMinutes, startOfDay } from "date-fns";
import type { CalendarEvent, PlannerPreferences, PlanHealth, Task } from "./types";
import { DEFAULT_PLANNER_PREFERENCES } from "./preferences";
import { planningWeekStart } from "./planner";

export function derivePlanHealth(
  tasks: Task[],
  events: CalendarEvent[],
  preferences: PlannerPreferences = DEFAULT_PLANNER_PREFERENCES,
  now = new Date()
): PlanHealth {
  const ws = planningWeekStart(now);
  const weekEnd = addDays(ws, 4);
  weekEnd.setHours(0, preferences.workEndMinutes, 0, 0);
  const planningStart = new Date(
    Math.max(
      now.getTime(),
      addMinutes(startOfDay(ws), preferences.workStartMinutes).getTime()
    )
  );

  // Include overdue work and tasks without a deadline. Both are eligible for
  // the same replanning pass as tasks due during this planning week.
  const activeTasks = tasks.filter(
    (t) =>
      !t.completed &&
      (!t.deadline || new Date(t.deadline) <= weekEnd)
  );

  const scheduledMinutesByTask = new Map<string, number>();
  for (const e of events) {
    if (!e.cancelled && e.taskId && new Date(e.start) >= planningStart && new Date(e.start) < weekEnd) {
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

  let capacityMinutes = 0;
  for (let dayIndex = 0; dayIndex < 5; dayIndex += 1) {
    const day = addDays(ws, dayIndex);
    const workStart = addMinutes(startOfDay(day), preferences.workStartMinutes);
    const workEnd = addMinutes(startOfDay(day), preferences.workEndMinutes);
    const availableStart = new Date(Math.max(planningStart.getTime(), workStart.getTime()));
    if (availableStart < workEnd) {
      capacityMinutes += differenceInMinutes(workEnd, availableStart);
    }
  }

  const busyMinutes = events
    .filter((e) => !e.cancelled && e.kind !== "task" && new Date(e.start) >= planningStart && new Date(e.start) < weekEnd)
    .reduce((sum, e) => sum + e.durationMinutes, 0);

  const alreadyScheduledTaskMinutes = events
    .filter((e) => !e.cancelled && e.kind === "task" && new Date(e.start) >= planningStart && new Date(e.start) < weekEnd)
    .reduce((sum, e) => sum + e.durationMinutes, 0);

  const availableMinutes = Math.max(
    0,
    capacityMinutes - busyMinutes - alreadyScheduledTaskMinutes
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
  preferences: PlannerPreferences = DEFAULT_PLANNER_PREFERENCES,
  now = new Date()
) {
  const health = derivePlanHealth(tasks, events, preferences, now);
  const ws = planningWeekStart(now);
  const weekEnd = addDays(ws, 4);
  weekEnd.setHours(0, preferences.workEndMinutes, 0, 0);
  const planningStart = new Date(
    Math.max(
      now.getTime(),
      addMinutes(startOfDay(ws), preferences.workStartMinutes).getTime()
    )
  );

  const scheduledMinutes = events
    .filter((e) => !e.cancelled && new Date(e.start) >= planningStart && new Date(e.start) < weekEnd)
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
