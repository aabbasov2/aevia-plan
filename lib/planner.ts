import { addDays, addMinutes, isBefore, startOfDay } from "date-fns";
import type { CalendarEvent, Task } from "./types";
import { weekStart } from "./time";

const WORK_START = 9 * 60;
const WORK_END = 18 * 60;
const LUNCH_START = 13 * 60;
const LUNCH_END = 14 * 60;
const SLOT = 10;
const BREAK_MINUTES = 10;
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

function planningWeekStart(now: Date) {
  const currentWeek = weekStart(now);
  return now.getDay() === 0 || now.getDay() === 6
    ? addDays(currentWeek, 7)
    : currentWeek;
}

export function buildPlan(tasks: Task[], events: CalendarEvent[], now = new Date()) {
  const ws = planningWeekStart(now);
  const isCurrentWeek = ws.getTime() === weekStart(now).getTime();
  const occupied = events.map((event) => ({
    start: new Date(event.start),
    end: addMinutes(new Date(event.start), event.durationMinutes),
  }));
  for (let day = 0; day < 5; day += 1) {
    const lunchStart = addMinutes(startOfDay(addDays(ws, day)), LUNCH_START);
    occupied.push({
      start: lunchStart,
      end: addMinutes(lunchStart, LUNCH_END - LUNCH_START),
    });
  }
  const blocks: PlannedBlock[] = [];
  const unscheduled: string[] = [];
  let nextTaskAllowedAt: Date | null = null;

  const scheduledByTask = new Map<string, number>();
  for (const event of events) {
    if (event.taskId) {
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

    let currentBlock: PlannedBlock | null = null;
    for (let day = 0; day < 5 && remaining > 0; day += 1) {
      for (let minutes = WORK_START; minutes < WORK_END && remaining > 0; minutes += SLOT) {
        const slotStart = addMinutes(startOfDay(addDays(ws, day)), minutes);
        const slotEnd = addMinutes(slotStart, SLOT);
        const deadline = task.deadline ? new Date(task.deadline) : addMinutes(startOfDay(addDays(ws, 4)), WORK_END);

        if (currentBlock && currentBlock.durationMinutes >= MAX_FOCUS_BLOCK_MINUTES) {
          currentBlock = flushBlock(currentBlock, blocks);
          nextTaskAllowedAt = addMinutes(slotStart, BREAK_MINUTES);
        }

        if (
          (isCurrentWeek && isBefore(slotEnd, now)) ||
          (nextTaskAllowedAt && isBefore(slotStart, nextTaskAllowedAt)) ||
          isBefore(deadline, slotEnd) ||
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

        occupied.push({ start: slotStart, end: addMinutes(slotStart, duration) });
        remaining -= duration;
      }
    }
    currentBlock = flushBlock(currentBlock, blocks);
    const taskBlocks = blocks.filter((block) => block.task.id === task.id);
    if (taskBlocks.length > 0) {
      const lastBlock = taskBlocks[taskBlocks.length - 1];
      nextTaskAllowedAt = addMinutes(
        new Date(lastBlock.start),
        lastBlock.durationMinutes + BREAK_MINUTES
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

export { WORK_END, WORK_START };
export { BREAK_MINUTES, MAX_FOCUS_BLOCK_MINUTES };
