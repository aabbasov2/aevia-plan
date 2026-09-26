"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addDays } from "date-fns";
import type { CalendarEvent, Commitment, Task } from "./types";
import { initialCommitments, initialEvents, initialTasks } from "./mock-data";
import { weekStart } from "./time";
import { buildPlan, MAX_FOCUS_BLOCK_MINUTES, overlaps } from "./planner";

type State = {
  tasks: Task[];
  events: CalendarEvent[];
  commitments: Commitment[];
  createTask: (t: Omit<Task, "id">) => string;
  createEvent: (e: Omit<CalendarEvent, "id">) => { created: boolean; movedTask: boolean; message?: string };
  scheduleTaskAt: (taskId: string, start: string) => void;
  toggleComplete: (id: string) => void;
  removeTask: (id: string) => void;
  scheduleTask: (taskId: string, dayIndex: number, startMinutes: number, baseWeekMs?: number) => void;
  moveEvent: (eventId: string, dayIndex: number, startMinutes: number, baseWeekMs?: number) => void;
  unschedule: (eventId: string) => void;
  applySuggestion: (
    taskId: string,
    dayIndex: number,
    startMinutes: number,
    durationMinutes: number
  ) => void;
  planWeek: () => { scheduledTaskCount: number; scheduledMinutes: number; unscheduled: string[] };
  createCommitment: (c: Omit<Commitment, "id">) => void;
  removeCommitment: (id: string) => void;
  clearPlan: () => void;
};

function makeIsoAt(dayIndex: number, minutes: number, baseWeek = weekStart()): string {
  const d = addDays(baseWeek, dayIndex);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return d.toISOString();
}

let seq = 1000;

export const useStore = create<State>()(persist((set, get) => ({
  tasks: initialTasks,
  events: initialEvents,
  commitments: initialCommitments,

  createCommitment: (c) =>
    set((s) => ({
      commitments: [{ id: `c${++seq}`, ...c }, ...s.commitments],
    })),

  removeCommitment: (id) =>
    set((s) => ({
      commitments: s.commitments.filter((c) => c.id !== id),
    })),

  clearPlan: () =>
    set({
      tasks: [],
      events: [],
    }),

  createTask: (t) => {
    const id = `t${++seq}`;
    set((s) => ({ tasks: [{ id, ...t }, ...s.tasks] }));
    return id;
  },

  createEvent: (e) => {
    const result = { created: false, movedTask: false, message: undefined as string | undefined };
    set((s) => {
      const start = new Date(e.start);
      const end = new Date(start.getTime() + e.durationMinutes * 60_000);
      const conflicts = s.events.filter((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(eventStart.getTime() + event.durationMinutes * 60_000);
        return start < eventEnd && end > eventStart;
      });
      const movableTasks = conflicts.filter((event) => {
        const task = event.taskId ? s.tasks.find((item) => item.id === event.taskId) : undefined;
        return event.taskId && task && !task.completed && !event.locked;
      });
      const blockedConflict = conflicts.find((event) => !movableTasks.includes(event));
      if (blockedConflict) {
        result.message = `That time is occupied by ${blockedConflict.title}.`;
        return s;
      }
      result.created = true;
      result.movedTask = movableTasks.length > 0;
      return {
        events: [
          { id: `e${++seq}`, ...e },
          ...s.events.filter((event) => !movableTasks.some((task) => task.id === event.id)),
        ],
      };
    });
    return result;
  },

  scheduleTaskAt: (taskId, start) =>
    set((s) => {
      const task = s.tasks.find((item) => item.id === taskId);
      if (!task) return s;
      const alreadyScheduled = s.events
        .filter((event) => event.taskId === taskId)
        .reduce((sum, event) => sum + event.durationMinutes, 0);
      const durationMinutes = Math.min(
        task.durationMinutes - alreadyScheduled,
        MAX_FOCUS_BLOCK_MINUTES
      );
      if (durationMinutes <= 0) return s;
      const startDate = new Date(start);
      const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);
      if (overlaps(startDate, endDate, s.events.map((event) => ({
        start: new Date(event.start),
        end: new Date(new Date(event.start).getTime() + event.durationMinutes * 60_000),
      })))) return s;
      return {
        events: [...s.events, {
          id: `e${++seq}`,
          title: task.title,
          start,
          durationMinutes,
          kind: "task" as const,
          project: task.project,
          taskId: task.id,
          colorIndex: task.colorIndex ?? 3,
          locked: true,
        }],
      };
    }),

  toggleComplete: (id) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      ),
    })),

  removeTask: (id) =>
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
      events: s.events.filter((e) => e.taskId !== id),
    })),

  scheduleTask: (taskId, dayIndex, startMinutes, baseWeekMs) =>
    set((s) => {
      const task = s.tasks.find((t) => t.id === taskId);
      if (!task) return s;
      const start = makeIsoAt(dayIndex, startMinutes, baseWeekMs ? new Date(baseWeekMs) : weekStart());
      const alreadyScheduled = s.events
        .filter((event) => event.taskId === taskId)
        .reduce((sum, event) => sum + event.durationMinutes, 0);
      const durationMinutes = Math.min(
        task.durationMinutes - alreadyScheduled,
        MAX_FOCUS_BLOCK_MINUTES
      );
      if (durationMinutes <= 0) return s;
      const startDate = new Date(start);
      const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);
      if (overlaps(startDate, endDate, s.events.map((event) => ({
        start: new Date(event.start),
        end: new Date(new Date(event.start).getTime() + event.durationMinutes * 60_000),
      })))) return s;
      const event: CalendarEvent = {
        id: `e${++seq}`,
        title: task.title,
        start,
        durationMinutes,
        kind: "task",
        project: task.project,
        taskId: task.id,
        colorIndex: task.colorIndex ?? 3,
      };
      return { events: [...s.events, event] };
    }),

  moveEvent: (eventId, dayIndex, startMinutes, baseWeekMs) =>
    set((s) => {
      const event = s.events.find((item) => item.id === eventId);
      if (!event) return s;
      const start = makeIsoAt(dayIndex, startMinutes, baseWeekMs ? new Date(baseWeekMs) : weekStart());
      const startDate = new Date(start);
      const endDate = new Date(startDate.getTime() + event.durationMinutes * 60_000);
      const otherEvents = s.events.filter((item) => item.id !== eventId);
      if (overlaps(startDate, endDate, otherEvents.map((item) => ({
        start: new Date(item.start),
        end: new Date(new Date(item.start).getTime() + item.durationMinutes * 60_000),
      })))) return s;
      return { events: s.events.map((item) => item.id === eventId ? { ...item, start } : item) };
    }),

  unschedule: (eventId) =>
    set((s) => ({
      events: s.events.filter((e) => e.id !== eventId),
    })),

  applySuggestion: (taskId, dayIndex, startMinutes, durationMinutes) =>
    set((s) => {
      const task = s.tasks.find((t) => t.id === taskId);
      if (!task) return s;
      const start = makeIsoAt(dayIndex, startMinutes);
      const event: CalendarEvent = {
        id: `e${++seq}`,
        title: task.title,
        start,
        durationMinutes,
        kind: "task",
        project: task.project,
        taskId: task.id,
        colorIndex: task.colorIndex ?? 3,
      };
      return { events: [...s.events, event] };
    }),
  planWeek: () => {
    const { tasks, events } = get();
    const completedTaskIds = new Set(
      tasks.filter((task) => task.completed).map((task) => task.id)
    );
    const stableEvents = events.filter(
      (event) =>
        event.kind !== "task" ||
        !event.taskId ||
        completedTaskIds.has(event.taskId) ||
        event.locked
    );
    const plan = buildPlan(tasks, stableEvents);
    set((s) => ({
      events: [
        ...stableEvents,
        ...plan.blocks.map((block) => ({
          id: `e${++seq}`,
          title: block.task.title,
          start: block.start,
          durationMinutes: block.durationMinutes,
          kind: "task" as const,
          project: block.task.project,
          taskId: block.task.id,
          colorIndex: block.task.colorIndex ?? 3,
        })),
      ],
    }));
    return {
      scheduledTaskCount: new Set(plan.blocks.map((block) => block.task.id)).size,
      scheduledMinutes: plan.blocks.reduce((sum, block) => sum + block.durationMinutes, 0),
      unscheduled: plan.unscheduled,
    };
  },
}), {
  name: "aevia-plan-store",
}));
