import { addDays, addMinutes, isBefore, startOfDay } from "date-fns";
import type { CalendarEvent, PlannerPreferences, Task } from "./types";
import { weekStart } from "./time";
import { DEFAULT_PLANNER_PREFERENCES } from "./preferences";

const SLOT = 10;
const MAX_FOCUS_BLOCK_MINUTES = 60;

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
  let nextTaskAllowedAt: Date | null = null;

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

    let currentBlock: PlannedBlock | null = null;
    for (let day = 0; day < 5 && remaining > 0; day += 1) {
      for (
        let minutes = preferences.workStartMinutes;
        minutes < preferences.workEndMinutes && remaining > 0;
        minutes += SLOT
      ) {
        const slotStart = addMinutes(startOfDay(addDays(ws, day)), minutes);
        const slotEnd = addMinutes(slotStart, SLOT);

        if (currentBlock && currentBlock.durationMinutes >= MAX_FOCUS_BLOCK_MINUTES) {
          currentBlock = flushBlock(currentBlock, blocks);
          nextTaskAllowedAt = addMinutes(slotStart, preferences.bufferMinutes);
        }

        if (
          (isCurrentWeek && isBefore(slotEnd, now)) ||
          (nextTaskAllowedAt && isBefore(slotStart, nextTaskAllowedAt)) ||
          isBefore(schedulingDeadline, slotEnd) ||
          overlaps(slotStart, slotEnd, occupied)
        ) {
          currentBlock = flushBlock(currentBlock, blocks);
          continue;
        }

        const duration = Math.min(SLOT, remaining);
        if (
          currentBlock &&
          new Date(currentBlock.start).getTime() + currentBlock.durationMinutes * 60_000 === slotStart.getTime()
        ) {
          currentBlock.durationMinutes += duration;
        } else {
          currentBlock = flushBlock(currentBlock, blocks);
          currentBlock = { task, start: slotStart.toISOString(), durationMinutes: duration };
        }

        occupied.push({
          start: slotStart,
          // Keep adjacent slots available while a focus block is being built.
          // The recovery buffer is enforced by nextTaskAllowedAt once the
          // complete block is flushed; applying it to every 10-minute slot
          // makes the task collide with itself.
          end: addMinutes(slotStart, duration),
        });
        remaining -= duration;
      }
    }
    currentBlock = flushBlock(currentBlock, blocks);
    const taskBlocks = blocks.filter((block) => block.task.id === task.id);
    if (taskBlocks.length > 0) {
      const lastBlock = taskBlocks[taskBlocks.length - 1];
      nextTaskAllowedAt = addMinutes(
        new Date(lastBlock.start),
        lastBlock.durationMinutes + preferences.bufferMinutes
      );
    }
    if (remaining > 0) unscheduled.push(task.id);
  }

  return { blocks, unscheduled };
}

function flushBlock(block: PlannedBlock | null, blocks: PlannedBlock[]) {
  if (block) blocks.push(block);
  return null;
}

export function overlaps(
  start: Date,
  end: Date,
  intervals: Array<{ start: Date; end: Date }>
) {
  return intervals.some((interval) => start < interval.end && end > interval.start);
}

export { MAX_FOCUS_BLOCK_MINUTES };
