"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addDays } from "date-fns";
import type { CalendarEvent, Commitment, PlannerPreferences, Task } from "./types";
import { initialCommitments, initialEvents, initialTasks } from "./mock-data";
import { weekStart } from "./time";
import { buildPlan, MAX_FOCUS_BLOCK_MINUTES, planningWeekStart } from "./planner";
import { DEFAULT_PLANNER_PREFERENCES } from "./preferences";

type State = {
  tasks: Task[];
  events: CalendarEvent[];
  commitments: Commitment[];
  plannerPreferences: PlannerPreferences;
  createTask: (t: Omit<Task, "id">) => string;
  createEvent: (e: Omit<CalendarEvent, "id">) => { created: boolean; movedTask: boolean; message?: string };
  addEvents: (events: Array<Omit<CalendarEvent, "id">>) => string[];
  updateEvent: (
    eventId: string,
    updates: Pick<CalendarEvent, "title" | "start" | "durationMinutes" | "kind" | "project" | "colorIndex">
  ) => { updated: boolean; movedTask: boolean; message?: string };
  scheduleTaskAt: (taskId: string, start: string) => void;
  toggleComplete: (id: string) => void;
  updateTaskDeadline: (id: string, deadline?: string) => void;
  removeTask: (id: string) => void;
  scheduleTask: (taskId: string, dayIndex: number, startMinutes: number, baseWeekMs?: number) => void;
  moveEvent: (eventId: string, dayIndex: number, startMinutes: number, baseWeekMs?: number) => void;
  unschedule: (eventId: string) => void;
  deleteEvents: (eventIds: string[]) => void;
  setEventsCancelled: (eventIds: string[], cancelled: boolean) => void;
  applySuggestion: (
    taskId: string,
    dayIndex: number,
    startMinutes: number,
    durationMinutes: number
  ) => void;
  planWeek: (baseWeekMs?: number) => { scheduledTaskCount: number; scheduledMinutes: number; unscheduled: string[] };
  updatePlannerPreferences: (preferences: PlannerPreferences) => void;
  ensureLunchEvents: (baseWeekMs?: number) => boolean;
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

function lunchIdFor(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `lunch-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function nearestAvailableLunchStart(
  preferredStart: Date,
  day: Date,
  preferences: PlannerPreferences,
  events: CalendarEvent[]
) {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const workStart = new Date(dayStart.getTime() + preferences.workStartMinutes * 60_000);
  const workEnd = new Date(dayStart.getTime() + preferences.workEndMinutes * 60_000);
  const durationMs = preferences.lunchDurationMinutes * 60_000;
  const isAvailable = (start: Date) => {
    const end = new Date(start.getTime() + durationMs);
    if (start < workStart || end > workEnd) return false;
    return !events.some((event) => {
      if (event.cancelled) return false;
      const eventStart = new Date(
        new Date(event.start).getTime() - preferences.bufferMinutes * 60_000
      );
      const eventEnd = new Date(
        new Date(event.start).getTime() +
          (event.durationMinutes + preferences.bufferMinutes) * 60_000
      );
      return start < eventEnd && end > eventStart;
    });
  };

  for (let offset = 0; offset <= 12 * 60; offset += 30) {
    const candidates = offset === 0
      ? [preferredStart]
      : [
          new Date(preferredStart.getTime() + offset * 60_000),
          new Date(preferredStart.getTime() - offset * 60_000),
        ];
    const available = candidates.find(isAvailable);
    if (available) return available;
  }
  return preferredStart;
}

let seq = 1000;

function nextEntityId(prefix: "t" | "e" | "c", usedIds: Set<string>) {
  let id: string;
  do {
    id = `${prefix}${++seq}`;
  } while (usedIds.has(id));
  usedIds.add(id);
  return id;
}

function repairDuplicateIds<T extends { id: string }>(
  items: T[],
  prefix: "t" | "e" | "c"
) {
  const occupiedIds = new Set(items.map((item) => item.id));
  const seenIds = new Set<string>();

  return items.map((item) => {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      return item;
    }

    const repairedItem = {
      ...item,
      id: nextEntityId(prefix, occupiedIds),
    };
    seenIds.add(repairedItem.id);
    return repairedItem;
  });
}

export const useStore = create<State>()(persist((set, get) => ({
  tasks: initialTasks,
  events: initialEvents,
  commitments: initialCommitments,
  plannerPreferences: DEFAULT_PLANNER_PREFERENCES,

  updatePlannerPreferences: (preferences) =>
    set((s) => {
      const lunchChanged =
        preferences.lunchStartMinutes !== s.plannerPreferences.lunchStartMinutes ||
        preferences.lunchDurationMinutes !== s.plannerPreferences.lunchDurationMinutes;
      return {
        plannerPreferences: preferences,
        events: lunchChanged
          ? s.events.filter((event) => event.kind !== "lunch")
          : s.events,
      };
    }),

  ensureLunchEvents: (baseWeekMs) => {
    let addedLunch = false;
    set((s) => {
      const baseWeek = baseWeekMs ? new Date(baseWeekMs) : weekStart();
      const activePlanningWeek = planningWeekStart(new Date());
      const canReplanThisWeek =
        weekStart(baseWeek).getTime() === activePlanningWeek.getTime();
      const now = new Date();
      const existingIds = new Set(s.events.map((event) => event.id));
      const lunches: CalendarEvent[] = [];
      for (let dayIndex = 0; dayIndex < 5; dayIndex += 1) {
        const day = addDays(baseWeek, dayIndex);
        const id = lunchIdFor(day);
        if (existingIds.has(id)) continue;
        const preferredStart = new Date(
          makeIsoAt(dayIndex, s.plannerPreferences.lunchStartMinutes, baseWeek)
        );
        const fixedEvents = s.events.filter((event) => {
          const task = event.taskId
            ? s.tasks.find((item) => item.id === event.taskId)
            : undefined;
          const isFutureMovableTask =
            canReplanThisWeek &&
            new Date(event.start) >= now &&
            event.taskId &&
            task &&
            !task.completed &&
            !event.locked &&
            event.origin !== "user";
          return !isFutureMovableTask;
        });
        const lunchStart = nearestAvailableLunchStart(
          preferredStart,
          day,
          s.plannerPreferences,
          [...fixedEvents, ...lunches]
        );
        lunches.push({
          id,
          title: "Lunch",
          start: lunchStart.toISOString(),
          durationMinutes: s.plannerPreferences.lunchDurationMinutes,
          kind: "lunch",
          origin: "aevia",
          project: "personal",
          colorIndex: 1,
          locked: true,
        });
      }
      if (lunches.length === 0) return s;
      addedLunch = true;
      return { events: [...s.events, ...lunches] };
    });
    return addedLunch;
  },

  createCommitment: (c) =>
    set((s) => {
      const usedIds = new Set(s.commitments.map((commitment) => commitment.id));
      return {
        commitments: [{ id: nextEntityId("c", usedIds), ...c }, ...s.commitments],
      };
    }),

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
    const usedIds = new Set(get().tasks.map((task) => task.id));
    const id = nextEntityId("t", usedIds);
    set((s) => ({ tasks: [{ id, ...t }, ...s.tasks] }));
    return id;
  },

  createEvent: (e) => {
    const result = { created: true, movedTask: false, message: undefined as string | undefined };
    set((s) => {
      const usedIds = new Set(s.events.map((event) => event.id));
      return {
        events: [{ id: nextEntityId("e", usedIds), ...e }, ...s.events],
      };
    });
    return result;
  },

  addEvents: (eventsToAdd) => {
    const createdIds: string[] = [];
    set((s) => {
      const usedIds = new Set(s.events.map((event) => event.id));
      const newEvents = eventsToAdd.map((event) => {
        const id = nextEntityId("e", usedIds);
        createdIds.push(id);
        return { id, ...event };
      });
      return { events: [...s.events, ...newEvents] };
    });
    return createdIds;
  },

  updateEvent: (eventId, updates) => {
    const result = { updated: false, movedTask: false, message: undefined as string | undefined };
    set((s) => {
      const current = s.events.find((event) => event.id === eventId);
      if (!current) {
        result.message = "This event is no longer on the calendar.";
        return s;
      }
      result.updated = true;
      return {
        events: s.events
          .map((event) =>
            event.id === eventId
              ? {
                  ...event,
                  ...updates,
                  origin: "user" as const,
                  locked: event.taskId || event.kind === "lunch" ? true : event.locked,
                }
              : event
          ),
      };
    });
    return result;
  },

  scheduleTaskAt: (taskId, start) =>
    set((s) => {
      const task = s.tasks.find((item) => item.id === taskId);
      if (!task) return s;
      const alreadyScheduled = s.events
        .filter((event) => event.taskId === taskId && !event.cancelled)
        .reduce((sum, event) => sum + event.durationMinutes, 0);
      const durationMinutes = Math.min(
        task.durationMinutes - alreadyScheduled,
        MAX_FOCUS_BLOCK_MINUTES
      );
      if (durationMinutes <= 0) return s;
      const usedIds = new Set(s.events.map((event) => event.id));
      return {
        events: [...s.events, {
          id: nextEntityId("e", usedIds),
          title: task.title,
          start,
          durationMinutes,
          kind: "task" as const,
          project: task.project,
          taskId: task.id,
          colorIndex: task.colorIndex ?? 3,
          locked: true,
          origin: "user" as const,
        }],
      };
    }),

  toggleComplete: (id) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      ),
    })),

  updateTaskDeadline: (id, deadline) =>
    set((s) => ({
      tasks: s.tasks.map((task) =>
        task.id === id ? { ...task, deadline } : task
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
        .filter((event) => event.taskId === taskId && !event.cancelled)
        .reduce((sum, event) => sum + event.durationMinutes, 0);
      const durationMinutes = Math.min(
        task.durationMinutes - alreadyScheduled,
        MAX_FOCUS_BLOCK_MINUTES
      );
      if (durationMinutes <= 0) return s;
      const usedIds = new Set(s.events.map((item) => item.id));
      const event: CalendarEvent = {
        id: nextEntityId("e", usedIds),
        title: task.title,
        start,
        durationMinutes,
        kind: "task",
        project: task.project,
        taskId: task.id,
        colorIndex: task.colorIndex ?? 3,
        origin: "user",
        locked: true,
      };
      return { events: [...s.events, event] };
    }),

  moveEvent: (eventId, dayIndex, startMinutes, baseWeekMs) =>
    set((s) => {
      const event = s.events.find((item) => item.id === eventId);
      if (!event) return s;
      const start = makeIsoAt(dayIndex, startMinutes, baseWeekMs ? new Date(baseWeekMs) : weekStart());
      return {
        events: s.events.map((item) =>
          item.id === eventId
            ? {
                ...item,
                start,
                origin: "user" as const,
                locked: item.taskId || item.kind === "lunch" ? true : item.locked,
              }
            : item
        ),
      };
    }),

  unschedule: (eventId) =>
    set((s) => ({
      events: s.events.filter((e) => e.id !== eventId),
    })),

  deleteEvents: (eventIds) => {
    const ids = new Set(eventIds);
    set((s) => ({
      events: s.events.filter((event) => !ids.has(event.id)),
    }));
  },

  setEventsCancelled: (eventIds, cancelled) => {
    const ids = new Set(eventIds);
    set((s) => ({
      events: s.events.map((event) =>
        ids.has(event.id) ? { ...event, cancelled } : event
      ),
    }));
  },

  applySuggestion: (taskId, dayIndex, startMinutes, durationMinutes) =>
    set((s) => {
      const task = s.tasks.find((t) => t.id === taskId);
      if (!task) return s;
      const start = makeIsoAt(dayIndex, startMinutes);
      const usedIds = new Set(s.events.map((event) => event.id));
      const event: CalendarEvent = {
        id: nextEntityId("e", usedIds),
        title: task.title,
        start,
        durationMinutes,
        kind: "task",
        project: task.project,
        taskId: task.id,
        colorIndex: task.colorIndex ?? 3,
        origin: "aevia",
      };
      return { events: [...s.events, event] };
    }),
  planWeek: (baseWeekMs) => {
    const now = new Date();
    const targetWeek = baseWeekMs
      ? weekStart(new Date(baseWeekMs))
      : planningWeekStart(now);
    const targetWeekEnd = addDays(targetWeek, 7);
    get().ensureLunchEvents(targetWeek.getTime());
    const { tasks, events, plannerPreferences } = get();
    const completedTaskIds = new Set(
      tasks.filter((task) => task.completed).map((task) => task.id)
    );
    const shouldReplan = (event: CalendarEvent) => {
      if (event.kind !== "task" || !event.taskId) return false;
      if (
        event.cancelled ||
        completedTaskIds.has(event.taskId) ||
        event.locked ||
        event.origin === "user"
      ) {
        return false;
      }
      const start = new Date(event.start);
      return start >= targetWeek && start < targetWeekEnd && start >= now;
    };
    const managedEvents = events.filter(shouldReplan);
    const stableEvents = events.filter((event) => !shouldReplan(event));
    const plan = buildPlan(
      tasks,
      stableEvents,
      plannerPreferences,
      now,
      targetWeek
    );
    const unscheduledIds = new Set(plan.unscheduled);
    const fallbackEvents = managedEvents.filter(
      (event) => event.taskId && unscheduledIds.has(event.taskId)
    );
    const acceptedBlocks = plan.blocks.filter(
      (block) => !unscheduledIds.has(block.task.id)
    );
    set((s) => {
      const usedIds = new Set(s.events.map((event) => event.id));
      return {
        events: [
          ...stableEvents,
          ...fallbackEvents,
          ...acceptedBlocks.map((block) => ({
            id: nextEntityId("e", usedIds),
            title: block.task.title,
            start: block.start,
            durationMinutes: block.durationMinutes,
            kind: "task" as const,
            project: block.task.project,
            taskId: block.task.id,
            colorIndex: block.task.colorIndex ?? 3,
            origin: "aevia" as const,
          })),
        ],
      };
    });
    return {
      scheduledTaskCount: new Set(acceptedBlocks.map((block) => block.task.id)).size,
      scheduledMinutes: acceptedBlocks.reduce((sum, block) => sum + block.durationMinutes, 0),
      unscheduled: plan.unscheduled,
    };
  },
}), {
  name: "aevia-plan-store",
  merge: (persistedState, currentState) => {
    const savedState = persistedState as Partial<State>;
    return {
      ...currentState,
      ...savedState,
      tasks: repairDuplicateIds(savedState.tasks ?? currentState.tasks, "t"),
      events: repairDuplicateIds(savedState.events ?? currentState.events, "e"),
      commitments: repairDuplicateIds(
        savedState.commitments ?? currentState.commitments,
        "c"
      ),
    };
  },
}));
