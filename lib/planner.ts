import { addDays, addMinutes, isBefore, startOfDay } from "date-fns";
import type { CalendarEvent, PlannerPreferences, Task } from "./types";
import { weekStart } from "./time";
import { DEFAULT_PLANNER_PREFERENCES } from "./preferences";

const SLOT = 10;
const MAX_FOCUS_BLOCK_MINUTES = 120;
const MIN_FOCUS_BLOCK_MINUTES = 45;

export type PlanRun = {
  scheduledTaskCount: number;
  scheduledMinutes: number;
  unscheduled: string[];
};

type PlannedBlock = {
  task: Task;
  start: string;
  durationMinutes: number;
};

export function planningWeekStart(now: Date) {
  const currentWeek = weekStart(now);
  return now.getDay() === 0 || now.getDay() === 6
    ? addDays(currentWeek, 7)
    : currentWeek;
}

export function buildPlan(
  tasks: Task[],
  events: CalendarEvent[],
  preferences: PlannerPreferences = DEFAULT_PLANNER_PREFERENCES,
  now = new Date(),
  targetWeek = planningWeekStart(now)
) {
  const ws = weekStart(targetWeek);
  const isCurrentWeek = ws.getTime() === weekStart(now).getTime();
  const occupied = events.filter((event) => !event.cancelled).map((event) => ({
    start: addMinutes(new Date(event.start), -preferences.bufferMinutes),
    end: addMinutes(
      new Date(event.start),
      event.durationMinutes + preferences.bufferMinutes
    ),
  }));
  const blocks: PlannedBlock[] = [];
  const unscheduled: string[] = [];
  const scheduledByTask = new Map<string, number>();
  for (const event of events) {
    if (!event.cancelled && event.taskId && new Date(event.start) >= now) {
      scheduledByTask.set(
        event.taskId,
        (scheduledByTask.get(event.taskId) ?? 0) + event.durationMinutes
      );
    }
  }

  const candidates = [...tasks]
    .filter((task) => !task.completed)
    .sort((a, b) => {
      const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      return aDeadline - bDeadline;
    });

  for (const task of candidates) {
    let remaining = Math.max(0, task.durationMinutes - (scheduledByTask.get(task.id) ?? 0));
    if (remaining === 0) continue;

    const fallbackDeadline = addMinutes(
      startOfDay(addDays(ws, 4)),
      preferences.workEndMinutes
    );
    const firstPlanningSlot = addMinutes(
      startOfDay(ws),
      preferences.workStartMinutes
    );
    const earliestPlanningTime = isCurrentWeek && now > firstPlanningSlot
      ? now
      : firstPlanningSlot;
    const statedDeadline = task.deadline ? new Date(task.deadline) : null;
    // An overdue deadline remains visible on the task, but it must not make
    // the task permanently impossible to place. Replan overdue work into the
    // earliest available future space instead.
    const schedulingDeadline =
      statedDeadline && statedDeadline > earliestPlanningTime
        ? statedDeadline
        : fallbackDeadline;

    const savedSessionPreference = task.splitPreference ? task.focusBlockMinutes : undefined;
    const requestedSession = Math.min(remaining, savedSessionPreference ?? remaining, MAX_FOCUS_BLOCK_MINUTES);
    const maximumSession = Math.max(Math.min(remaining, MIN_FOCUS_BLOCK_MINUTES), requestedSession);
    while (remaining > 0) {
      let sessionCount = Math.ceil(remaining / maximumSession);
      if (sessionCount > 1 && remaining / sessionCount < MIN_FOCUS_BLOCK_MINUTES) sessionCount -= 1;
      const sessionMinutes = sessionCount > 1
        ? Math.ceil((remaining / sessionCount) / SLOT) * SLOT
        : remaining;
      const requiredMinutes = Math.min(remaining, sessionMinutes);
      let placed: Date | null = null;

      for (let day = 0; day < 5 && !placed; day += 1) {
        const dayStart = startOfDay(addDays(ws, day));
        const earliest = isCurrentWeek && day === now.getDay() - 1
          ? Math.max(preferences.workStartMinutes, now.getHours() * 60 + now.getMinutes())
          : preferences.workStartMinutes;
        for (let minute = Math.ceil(earliest / SLOT) * SLOT; minute + requiredMinutes <= preferences.workEndMinutes; minute += SLOT) {
          const slotStart = addMinutes(dayStart, minute);
          const slotEnd = addMinutes(slotStart, requiredMinutes);
          if (isBefore(schedulingDeadline, slotEnd) || overlaps(slotStart, slotEnd, occupied)) continue;
          placed = slotStart;
          break;
        }
      }

      if (!placed) break;
      blocks.push({ task, start: placed.toISOString(), durationMinutes: requiredMinutes });
      occupied.push({
        start: addMinutes(placed, -preferences.bufferMinutes),
        end: addMinutes(placed, requiredMinutes + preferences.bufferMinutes),
      });
      remaining -= requiredMinutes;
    }
    if (remaining > 0) unscheduled.push(task.id);
  }

  return { blocks, unscheduled };
}

export function overlaps(
  start: Date,
  end: Date,
  intervals: Array<{ start: Date; end: Date }>
) {
  return intervals.some((interval) => start < interval.end && end > interval.start);
}

export { MAX_FOCUS_BLOCK_MINUTES, MIN_FOCUS_BLOCK_MINUTES };
