"use client";

import { create } from "zustand";
import { addDays } from "date-fns";
import type { CalendarEvent, Commitment, Task } from "./types";
import { initialCommitments, initialEvents, initialTasks } from "./mock-data";
import { weekStart } from "./time";

type State = {
  tasks: Task[];
  events: CalendarEvent[];
  commitments: Commitment[];
  createTask: (t: Omit<Task, "id">) => void;
  toggleComplete: (id: string) => void;
  removeTask: (id: string) => void;
  scheduleTask: (taskId: string, dayIndex: number, startMinutes: number) => void;
  moveEvent: (eventId: string, dayIndex: number, startMinutes: number) => void;
  unschedule: (eventId: string) => void;
  applySuggestion: (
    taskId: string,
    dayIndex: number,
    startMinutes: number,
    durationMinutes: number
  ) => void;
  createCommitment: (c: Omit<Commitment, "id">) => void;
  removeCommitment: (id: string) => void;
};

function makeIsoAt(dayIndex: number, minutes: number): string {
  const d = addDays(weekStart(), dayIndex);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return d.toISOString();
}

let seq = 1000;

export const useStore = create<State>((set) => ({
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

  createTask: (t) =>
    set((s) => ({
      tasks: [{ id: `t${++seq}`, ...t }, ...s.tasks],
    })),

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

  scheduleTask: (taskId, dayIndex, startMinutes) =>
    set((s) => {
      const task = s.tasks.find((t) => t.id === taskId);
      if (!task) return s;
      const start = makeIsoAt(dayIndex, startMinutes);
      const event: CalendarEvent = {
        id: `e${++seq}`,
        title: task.title,
        start,
        durationMinutes: task.durationMinutes,
        kind: "task",
        project: task.project,
        taskId: task.id,
        colorIndex: task.colorIndex ?? 3,
      };
      return { events: [...s.events, event] };
    }),

  moveEvent: (eventId, dayIndex, startMinutes) =>
    set((s) => ({
      events: s.events.map((e) =>
        e.id === eventId
          ? { ...e, start: makeIsoAt(dayIndex, startMinutes) }
          : e
      ),
    })),

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
}));
