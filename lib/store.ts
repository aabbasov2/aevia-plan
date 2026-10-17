"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { addDays } from "date-fns";
import type { AssistantMessage, CalendarEvent, Commitment, FocusArtifactStyle, InboxItem, PlannerPreferences, Task } from "./types";
import { weekStart } from "./time";
import { buildPlan, MAX_FOCUS_BLOCK_MINUTES, planningWeekStart } from "./planner";
import { DEFAULT_PLANNER_PREFERENCES } from "./preferences";
import type { DayRecoveryProposal } from "./recovery";
import {
  completeFocusSession,
  endFocusSession,
  pauseFocusSession,
  remainingMilliseconds,
  resumeFocusSession,
  recordFocusSession,
  type CapturedDistraction,
  type FocusSession,
  type FocusSessionKind,
} from "./focus-time";

export type RecoveryChange = {
  reason: string;
  targetDate: string;
  unavailableEvent?: Omit<CalendarEvent, "id">;
  updatedEvent?: Pick<CalendarEvent, "id" | "start" | "durationMinutes">;
};

export type TodayBackground = "mountains" | "cafe" | "library" | "rain";

let activeStorageUserId = "";
let allowUnscopedStorage = false;
const accountScopedStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === "undefined" || !activeStorageUserId) return null;
    return window.localStorage.getItem(`${name}:${activeStorageUserId}`) ?? (allowUnscopedStorage ? window.localStorage.getItem(name) : null);
  },
  setItem: (name, value) => {
    if (typeof window === "undefined" || !activeStorageUserId) return;
    window.localStorage.setItem(`${name}:${activeStorageUserId}`, value);
    if (allowUnscopedStorage) window.localStorage.removeItem(name);
  },
  removeItem: (name) => {
    if (typeof window === "undefined" || !activeStorageUserId) return;
    window.localStorage.removeItem(`${name}:${activeStorageUserId}`);
    if (allowUnscopedStorage) window.localStorage.removeItem(name);
  },
};

export function setStoreAccountScope(userId: string, allowLegacyData: boolean) {
  activeStorageUserId = userId;
  allowUnscopedStorage = allowLegacyData;
}

export function preserveLegacyStoreForAccount(userId: string) {
  if (typeof window === "undefined") return;
  const legacy = window.localStorage.getItem("aevia-plan-store");
  if (!legacy) return;
  const accountKey = `aevia-plan-store:${userId}`;
  if (!window.localStorage.getItem(accountKey)) window.localStorage.setItem(accountKey, legacy);
  else window.localStorage.setItem(`aevia-plan-store:legacy-backup:${userId}:${Date.now()}`, legacy);
  window.localStorage.removeItem("aevia-plan-store");
}

export function hasLegacyStoreData() {
  return typeof window !== "undefined" && window.localStorage.getItem("aevia-plan-store") !== null;
}

export function hasScopedStoreData(userId: string) {
  return typeof window !== "undefined" && window.localStorage.getItem(`aevia-plan-store:${userId}`) !== null;
}

type State = {
  tasks: Task[];
  events: CalendarEvent[];
  commitments: Commitment[];
  plannerPreferences: PlannerPreferences;
  todayBackground: TodayBackground;
  setTodayBackground: (scene: TodayBackground) => void;
  focusSession: FocusSession | null;
  focusHistory: FocusSession[];
  focusArtifact: FocusArtifactStyle;
  setFocusArtifact: (style: FocusArtifactStyle) => void;
  focusModeOpen: boolean;
  setFocusModeOpen: (open: boolean) => void;
  capturedDistractions: CapturedDistraction[];
  inboxItems: InboxItem[];
  assistantMessages: AssistantMessage[];
  appendAssistantMessage: (message: Pick<AssistantMessage, "role" | "content">) => void;
  startFocusSession: (taskId: string | undefined, durationMinutes: number, kind?: FocusSessionKind) => boolean;
  pauseFocus: () => void;
  resumeFocus: () => void;
  completeFocus: () => void;
  finishFocus: () => void;
  endFocus: () => void;
  captureDistraction: (text: string, category?: CapturedDistraction["category"]) => string;
  updateDistractionStatus: (id: string, status: CapturedDistraction["status"]) => void;
  convertDistractionToTask: (id: string, title: string) => string | undefined;
  recoveryUndoEvents: CalendarEvent[] | null;
  previewDayRecovery: (change: RecoveryChange) => DayRecoveryProposal | null;
  applyDayRecovery: (proposal: DayRecoveryProposal) => void;
  undoDayRecovery: () => boolean;
  createTask: (
    t: Omit<Task, "id">,
    options?: { autoSchedule?: boolean }
  ) => string;
  scheduleTaskBeforeDeadline: (taskId: string) => void;
  scheduleUnscheduledTask: (taskId: string) => { scheduled: boolean; scheduledMinutes: number };
  createEvent: (e: Omit<CalendarEvent, "id">) => { created: boolean; movedTask: boolean; eventId?: string; message?: string };
  previewConflictReplan: (eventId: string) => ConflictReplanProposal | null;
  applyConflictReplan: (proposal: ConflictReplanProposal) => void;
  addEvents: (events: Array<Omit<CalendarEvent, "id">>) => string[];
  updateEvent: (
    eventId: string,
    updates: Pick<CalendarEvent, "title" | "start" | "durationMinutes" | "kind" | "project" | "colorIndex">
  ) => { updated: boolean; movedTask: boolean; message?: string };
  scheduleTaskAt: (taskId: string, start: string) => void;
  toggleComplete: (id: string) => void;
  markEventPromptAsked: (eventId: string, prompt: "focus" | "completion") => void;
  respondToEventPrompt: (eventId: string, prompt: "focus" | "completion", response: "started" | "skipped" | "expired" | "done" | "not_done") => void;
  updateTask: (id: string, updates: Partial<Omit<Task, "id">>) => void;
  updateTaskDeadline: (id: string, deadline?: string) => void;
  removeTask: (id: string) => void;
  scheduleTask: (taskId: string, dayIndex: number, startMinutes: number, baseWeekMs?: number) => string | undefined;
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
  applyPlanPreview: (baseWeekMs: number, blocks: Array<{ taskId: string; start: string; durationMinutes: number }>) => boolean;
  updatePlannerPreferences: (preferences: PlannerPreferences) => void;
  ensureLunchEvents: (baseWeekMs?: number) => boolean;
  createCommitment: (c: Omit<Commitment, "id">) => void;
  removeCommitment: (id: string) => void;
  createInboxItem: (item: Omit<InboxItem, "id">) => string;
  updateInboxItem: (id: string, updates: Partial<Pick<InboxItem, "title" | "snippet" | "status">>) => void;
  removeInboxItem: (id: string) => void;
  clearPlan: () => void;
};

export type ConflictReplanProposal = {
  overlaps: CalendarEvent[];
  conflicts: CalendarEvent[];
  displaced: CalendarEvent[];
  replacements: Array<Omit<CalendarEvent, "id">>;
  unscheduledTaskTitles: string[];
};

function makeIsoAt(dayIndex: number, minutes: number, baseWeek = weekStart()): string {
  const d = addDays(baseWeek, dayIndex);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return d.toISOString();
}

function mergeAdjacentTaskBlocks(events: CalendarEvent[], changedEventId: string): CalendarEvent[] {
  const originalIndex = events.findIndex((event) => event.id === changedEventId);
  const changed = events[originalIndex];
  if (!changed || changed.kind !== "task" || !changed.taskId || changed.cancelled) return events;

  let merged = { ...changed };
  let mergedStart = new Date(merged.start).getTime();
  let mergedEnd = mergedStart + merged.durationMinutes * 60_000;
  const mergedIds = new Set([changedEventId]);
  let foundNeighbor = true;

  while (foundNeighbor) {
    foundNeighbor = false;
    const neighbor = events.find((event) => {
      if (mergedIds.has(event.id) || event.kind !== "task" || event.taskId !== changed.taskId || event.cancelled) return false;
      const eventStart = new Date(event.start).getTime();
      const eventEnd = eventStart + event.durationMinutes * 60_000;
      return new Date(eventStart).toDateString() === new Date(mergedStart).toDateString() && eventStart <= mergedEnd && eventEnd >= mergedStart;
    });
    if (!neighbor) continue;

    const neighborStart = new Date(neighbor.start).getTime();
    const neighborEnd = neighborStart + neighbor.durationMinutes * 60_000;
    mergedStart = Math.min(mergedStart, neighborStart);
    mergedEnd = Math.max(mergedEnd, neighborEnd);
    mergedIds.add(neighbor.id);
    merged = {
      ...merged,
      start: new Date(mergedStart).toISOString(),
      durationMinutes: Math.round((mergedEnd - mergedStart) / 60_000),
      focusPromptAskedAt: merged.focusPromptAskedAt ?? neighbor.focusPromptAskedAt,
      focusPromptResponse: merged.focusPromptResponse ?? neighbor.focusPromptResponse,
      completionPromptAskedAt: merged.completionPromptAskedAt ?? neighbor.completionPromptAskedAt,
      completionPromptResponse: merged.completionPromptResponse ?? neighbor.completionPromptResponse,
    };
    foundNeighbor = true;
  }

  if (mergedIds.size === 1) return events;
  return events.flatMap((event, index) => index === originalIndex ? [merged] : mergedIds.has(event.id) ? [] : [event]);
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

function newUuid() {
  return globalThis.crypto?.randomUUID?.() ?? `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0").slice(-12)}`;
}

function nextEntityId(_prefix: "t" | "e" | "c", usedIds: Set<string>) {
  let id = newUuid();
  while (usedIds.has(id)) id = newUuid();
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

function focusEntityId(prefix: string) {
  void prefix;
  return newUuid();
}

function migratePersistedWorkspace(savedState: Partial<State>, currentState: State): State {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const entityId = (value: unknown) => typeof value === "string" && uuidPattern.test(value) ? value : newUuid();
  const tasks = repairDuplicateIds(savedState.tasks ?? currentState.tasks, "t");
  const taskIds = new Map(tasks.map((task) => [task.id, entityId(task.id)]));
  const events = repairDuplicateIds(savedState.events ?? currentState.events, "e");
  const eventIds = new Map(events.map((event) => [event.id, event.kind === "lunch" ? lunchIdFor(new Date(event.start)) : entityId(event.id)]));
  const commitments = repairDuplicateIds(savedState.commitments ?? currentState.commitments, "c");
  const commitmentIds = new Map(commitments.map((item) => [item.id, entityId(item.id)]));
  const focusRows = [...(savedState.focusHistory ?? currentState.focusHistory), ...(savedState.focusSession ? [savedState.focusSession] : [])];
  const focusIds = new Map(focusRows.map((session) => [session.id, entityId(session.id)]));
  const thoughtIds = new Map((savedState.capturedDistractions ?? currentState.capturedDistractions).map((thought) => [thought.id, entityId(thought.id)]));
  const migratedTasks = tasks.map((task) => ({
    ...task,
    id: taskIds.get(task.id)!,
    sourceDistractionId: task.sourceDistractionId ? thoughtIds.get(task.sourceDistractionId) ?? entityId(task.sourceDistractionId) : undefined,
  }));
  const migratedEvents = events.map((event) => ({ ...event, id: eventIds.get(event.id)!, taskId: event.taskId ? taskIds.get(event.taskId) ?? entityId(event.taskId) : undefined }));
  const migratedCommitments = commitments.map((item) => ({ ...item, id: commitmentIds.get(item.id)! }));
  const migratedSession = savedState.focusSession ? {
    ...savedState.focusSession,
    id: focusIds.get(savedState.focusSession.id)!,
    taskId: savedState.focusSession.taskId ? taskIds.get(savedState.focusSession.taskId) ?? entityId(savedState.focusSession.taskId) : undefined,
  } : currentState.focusSession;
  const migratedHistory = (savedState.focusHistory ?? currentState.focusHistory).map((session) => ({
    ...session,
    id: focusIds.get(session.id)!,
    taskId: session.taskId ? taskIds.get(session.taskId) ?? entityId(session.taskId) : undefined,
  }));
  const migratedThoughts = (savedState.capturedDistractions ?? currentState.capturedDistractions).map((thought) => ({
    ...thought,
    id: thoughtIds.get(thought.id)!,
    sessionId: thought.sessionId ? focusIds.get(thought.sessionId) ?? entityId(thought.sessionId) : undefined,
    taskId: thought.taskId ? taskIds.get(thought.taskId) ?? entityId(thought.taskId) : undefined,
    convertedTaskId: thought.convertedTaskId ? taskIds.get(thought.convertedTaskId) ?? entityId(thought.convertedTaskId) : undefined,
  }));
  const migratedInboxItems = (savedState.inboxItems ?? currentState.inboxItems).map((item) => ({ ...item, id: entityId(item.id) }));
  return {
    ...currentState,
    ...savedState,
    tasks: migratedTasks,
    events: migratedEvents,
    commitments: migratedCommitments,
    focusSession: migratedSession,
    focusHistory: migratedHistory,
    focusArtifact: savedState.focusArtifact ?? currentState.focusArtifact ?? "arc",
    capturedDistractions: migratedThoughts,
    inboxItems: migratedInboxItems,
    assistantMessages: savedState.assistantMessages ?? currentState.assistantMessages,
    todayBackground: savedState.todayBackground ?? currentState.todayBackground,
  };
}

function lunchIdFor(date: Date) {
  const day = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `00000000-0000-4000-8000-${day}0000`;
}

export const useStore = create<State>()(persist((set, get) => ({
  tasks: [],
  events: [],
  commitments: [],
  plannerPreferences: DEFAULT_PLANNER_PREFERENCES,
  todayBackground: "mountains",
  setTodayBackground: (scene) => set({ todayBackground: scene }),
  focusSession: null,
  focusHistory: [],
  focusArtifact: "arc",
  setFocusArtifact: (focusArtifact) => set({ focusArtifact }),
  focusModeOpen: false,
  setFocusModeOpen: (focusModeOpen) => set({ focusModeOpen }),
  capturedDistractions: [],
  inboxItems: [],
  assistantMessages: [],
  appendAssistantMessage: (message) => set((state) => ({
    assistantMessages: [...state.assistantMessages, { ...message, id: newUuid(), createdAt: Date.now() }].slice(-100),
  })),
  startFocusSession: (taskId, durationMinutes, kind = "focus") => {
    const { focusSession, tasks } = get();
    if (focusSession && (focusSession.status === "running" || focusSession.status === "paused")) return false;
    const previousHistory = focusSession ? recordFocusSession(get().focusHistory, focusSession) : get().focusHistory;
    const task = kind === "focus" ? tasks.find((item) => item.id === taskId && !item.completed) : undefined;
    const safeDuration = Math.max(1, Math.min(180, Math.round(Number.isFinite(durationMinutes) ? durationMinutes : 15)));
    const now = Date.now();
    set({
      focusSession: {
        id: focusEntityId("focus"),
        kind,
        taskId: task?.id,
        taskTitle: task?.title,
        durationMinutes: safeDuration,
        startedAt: now,
        status: "running",
        targetEndAt: now + safeDuration * 60_000,
        lastResumedAt: now,
        remainingMs: null,
        focusedMs: 0,
      },
      focusHistory: previousHistory,
      focusModeOpen: true,
    });
    return true;
  },
  pauseFocus: () => set((state) => {
    if (!state.focusSession) return state;
    if (state.focusSession.status === "running" && remainingMilliseconds(state.focusSession) === 0) {
      const completed = completeFocusSession(state.focusSession);
      return { focusSession: completed, focusHistory: recordFocusSession(state.focusHistory, completed) };
    }
    const paused = pauseFocusSession(state.focusSession);
    return paused === state.focusSession ? state : { focusSession: paused };
  }),
  resumeFocus: () => set((state) => {
    if (!state.focusSession) return state;
    if (state.focusSession.status === "paused" && remainingMilliseconds(state.focusSession) === 0) {
      const completed = completeFocusSession({ ...state.focusSession, status: "running", targetEndAt: Date.now(), lastResumedAt: Date.now() });
      return { focusSession: completed, focusHistory: recordFocusSession(state.focusHistory, completed) };
    }
    const resumed = resumeFocusSession(state.focusSession);
    return resumed === state.focusSession ? state : { focusSession: resumed };
  }),
  completeFocus: () => set((state) => {
    if (!state.focusSession) return state;
    const completed = completeFocusSession(state.focusSession);
    if (completed === state.focusSession) return state;
    return { focusSession: completed, focusHistory: recordFocusSession(state.focusHistory, completed) };
  }),
  finishFocus: () => set((state) => {
    if (!state.focusSession || (state.focusSession.status !== "running" && state.focusSession.status !== "paused")) return state;
    const completed = completeFocusSession(state.focusSession, Date.now(), true);
    return { focusSession: completed, focusHistory: recordFocusSession(state.focusHistory, completed) };
  }),
  endFocus: () => set((state) => {
    if (!state.focusSession) return state;
    if (state.focusSession.status === "running" && remainingMilliseconds(state.focusSession) === 0) {
      const completed = completeFocusSession(state.focusSession);
      return { focusSession: completed, focusHistory: recordFocusSession(state.focusHistory, completed) };
    }
    const ended = endFocusSession(state.focusSession);
    if (ended === state.focusSession) return state;
    return { focusSession: ended, focusHistory: recordFocusSession(state.focusHistory, ended), focusModeOpen: false };
  }),
  captureDistraction: (text, category = "thought") => {
    const cleanText = text.trim();
    if (!cleanText) return "";
    const session = get().focusSession;
    const sessionId = session?.kind === "focus" ? session.id : undefined;
    const recentRetry = get().capturedDistractions.find((item) => item.text === cleanText && item.sessionId === sessionId && Date.now() - item.createdAt < 5_000);
    if (recentRetry) return recentRetry.id;
    const id = focusEntityId("thought");
    const thought: CapturedDistraction = {
      id,
      text: cleanText,
      createdAt: Date.now(),
      category,
      sessionId,
      taskId: sessionId ? session?.taskId : undefined,
      status: "unprocessed",
    };
    set((state) => ({ capturedDistractions: [thought, ...state.capturedDistractions] }));
    return id;
  },
  updateDistractionStatus: (id, status) => set((state) => ({
    capturedDistractions: state.capturedDistractions.map((thought) => thought.id === id && thought.status !== "converted"
      ? { ...thought, status }
      : thought),
  })),
  convertDistractionToTask: (id, title) => {
    const thought = get().capturedDistractions.find((item) => item.id === id);
    if (!thought) return undefined;
    if (thought.status === "converted") return thought.convertedTaskId;
    const previouslyCreatedTask = get().tasks.find((task) => task.sourceDistractionId === id);
    if (previouslyCreatedTask) {
      set((state) => ({ capturedDistractions: state.capturedDistractions.map((item) => item.id === id
        ? { ...item, status: "converted", convertedTaskId: previouslyCreatedTask.id }
        : item) }));
      return previouslyCreatedTask.id;
    }
    const taskId = get().createTask({
      title: title.trim() || thought.text,
      durationMinutes: 30,
      recurrence: { kind: "none" },
      project: "personal",
      notes: thought.text,
      sourceDistractionId: id,
    }, { autoSchedule: false });
    set((state) => ({
      capturedDistractions: state.capturedDistractions.map((item) => item.id === id
        ? { ...item, status: "converted", convertedTaskId: taskId }
        : item),
    }));
    return taskId;
  },
  recoveryUndoEvents: null,

  previewDayRecovery: (change) => {
    const { tasks, events, plannerPreferences } = get();
    const now = new Date();
    const targetWeek = weekStart(new Date(`${change.targetDate}T12:00:00`));
    const targetWeekEnd = addDays(targetWeek, 7);
    const completedTaskIds = new Set(tasks.filter((task) => task.completed).map((task) => task.id));
    const removedEvents = events.filter((event) => {
      if (event.kind !== "task" || !event.taskId || event.cancelled || event.locked || event.origin !== "aevia") return false;
      if (completedTaskIds.has(event.taskId)) return false;
      const start = new Date(event.start);
      return start >= now && start >= targetWeek && start < targetWeekEnd;
    });
    const removedIds = new Set(removedEvents.map((event) => event.id));
    const stableEvents = events
      .filter((event) => !removedIds.has(event.id))
      .map((event) => event.id === change.updatedEvent?.id
        ? { ...event, start: change.updatedEvent.start, durationMinutes: change.updatedEvent.durationMinutes }
        : event);
    const eventsForPlanner = change.unavailableEvent
      ? [...stableEvents, { id: "recovery-unavailable-preview", ...change.unavailableEvent }]
      : stableEvents;
    const plan = buildPlan(tasks, eventsForPlanner, plannerPreferences, now, targetWeek);
    const atRiskIds = new Set(plan.unscheduled);
    const proposedTaskEvents = plan.blocks.map((block) => ({
      title: block.task.title,
      start: block.start,
      durationMinutes: block.durationMinutes,
      kind: "task" as const,
      taskId: block.task.id,
      project: block.task.project,
      colorIndex: block.task.colorIndex ?? 3,
      origin: "aevia" as const,
    }));
    return {
      reason: change.reason,
      weekStartMs: targetWeek.getTime(),
      removedEvents,
      updatedEvents: change.updatedEvent ? [change.updatedEvent] : [],
      addedEvents: change.unavailableEvent ? [change.unavailableEvent] : [],
      proposedTaskEvents,
      atRiskTaskTitles: tasks.filter((task) => atRiskIds.has(task.id)).map((task) => task.title),
    };
  },

  applyDayRecovery: (proposal) =>
    set((state) => {
      const removeIds = new Set(proposal.removedEvents.map((event) => event.id));
      const updatedEvents = state.events
        .filter((event) => !removeIds.has(event.id))
        .map((event) => {
          const update = proposal.updatedEvents.find((item) => item.id === event.id);
          return update ? { ...event, start: update.start, durationMinutes: update.durationMinutes } : event;
        });
      const usedIds = new Set(updatedEvents.map((event) => event.id));
      const additions = [...proposal.addedEvents, ...proposal.proposedTaskEvents].map((event) => ({
        ...event,
        id: nextEntityId("e", usedIds),
      }));
      return {
        recoveryUndoEvents: state.events,
        events: [...updatedEvents, ...additions],
      };
    }),

  undoDayRecovery: () => {
    const snapshot = get().recoveryUndoEvents;
    if (!snapshot) return false;
    set({ events: snapshot, recoveryUndoEvents: null });
    return true;
  },

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

  createInboxItem: (item) => {
    const usedIds = new Set(get().inboxItems.map((entry) => entry.id));
    const id = nextEntityId("c", usedIds);
    set((state) => ({ inboxItems: [{ id, ...item }, ...state.inboxItems] }));
    return id;
  },
  updateInboxItem: (id, updates) => set((state) => ({ inboxItems: state.inboxItems.map((item) => item.id === id ? { ...item, ...updates } : item) })),
  removeInboxItem: (id) => set((state) => ({ inboxItems: state.inboxItems.filter((item) => item.id !== id) })),

  clearPlan: () =>
    set({
      tasks: [],
      events: [],
      recoveryUndoEvents: null,
    }),

  scheduleTaskBeforeDeadline: (taskId) => {
    const { tasks, plannerPreferences } = get();
    const task = tasks.find((item) => item.id === taskId);
    if (!task?.deadline) return;

    const now = new Date();
    const deadline = new Date(task.deadline);
    if (deadline <= now) return;

    let targetWeek = planningWeekStart(now);
    const deadlineWeek = weekStart(deadline);
    const plannedEvents: CalendarEvent[] = [];
    const futureScheduledMinutes = () =>
      [...get().events, ...plannedEvents]
        .filter(
          (event) =>
            event.taskId === taskId &&
            !event.cancelled &&
            new Date(event.start) >= now
        )
        .reduce((sum, event) => sum + event.durationMinutes, 0);

    while (
      targetWeek <= deadlineWeek &&
      futureScheduledMinutes() < task.durationMinutes
    ) {
      const earliestSlot = new Date(targetWeek);
      earliestSlot.setHours(0, 0, 0, 0);
      earliestSlot.setMinutes(plannerPreferences.workStartMinutes);
      if (
        targetWeek.getTime() === weekStart(now).getTime() &&
        now > earliestSlot
      ) {
        earliestSlot.setTime(now.getTime());
      }
      if (deadline <= earliestSlot) break;

      get().ensureLunchEvents(targetWeek.getTime());
      const usedIds = new Set([
        ...get().events.map((event) => event.id),
        ...plannedEvents.map((event) => event.id),
      ]);
      const plan = buildPlan(
        [task],
        [...get().events, ...plannedEvents],
        plannerPreferences,
        now,
        targetWeek
      );
      for (const block of plan.blocks) {
        const event: CalendarEvent = {
          id: nextEntityId("e", usedIds),
          title: block.task.title,
          start: block.start,
          durationMinutes: block.durationMinutes,
          kind: "task",
          taskId: block.task.id,
          project: block.task.project,
          colorIndex: block.task.colorIndex ?? 3,
          origin: "aevia",
        };
        plannedEvents.push(event);
      }
      targetWeek = addDays(targetWeek, 7);
    }

    if (plannedEvents.length > 0) {
      set((state) => ({ events: [...state.events, ...plannedEvents] }));
    }
  },

  createTask: (t, options) => {
    const usedIds = new Set(get().tasks.map((task) => task.id));
    const id = nextEntityId("t", usedIds);
    set((s) => ({ tasks: [{ id, ...t }, ...s.tasks] }));
    if (t.deadline && options?.autoSchedule !== false) {
      get().scheduleTaskBeforeDeadline(id);
    }
    return id;
  },

  createEvent: (e) => {
    const result = { created: true, movedTask: false, eventId: "", message: undefined as string | undefined };
    set((s) => {
      const usedIds = new Set(s.events.map((event) => event.id));
      result.eventId = nextEntityId("e", usedIds);
      return {
        events: [{ id: result.eventId, ...e }, ...s.events],
      };
    });
    return result;
  },

  previewConflictReplan: (eventId) => {
    const { events, tasks, plannerPreferences } = get();
    const addedEvent = events.find((event) => event.id === eventId);
    if (!addedEvent) return null;
    const addedStart = new Date(addedEvent.start);
    const addedEnd = new Date(addedStart.getTime() + addedEvent.durationMinutes * 60_000);
    const overlaps = events.filter((event) => {
      if (event.id === eventId || event.cancelled) return false;
      const start = new Date(event.start);
      const end = new Date(start.getTime() + event.durationMinutes * 60_000);
      return start < addedEnd && end > addedStart;
    });
    if (overlaps.length === 0) return null;

    const conflicts = overlaps.filter((event) =>
      event.kind === "task" && Boolean(event.taskId) && !event.locked && event.origin === "aevia"
    );
    if (conflicts.length === 0) {
      return { overlaps, conflicts: [], displaced: [], replacements: [], unscheduledTaskTitles: [] };
    }

    const now = new Date();
    const targetWeek = weekStart(addedStart);
    const targetWeekEnd = addDays(targetWeek, 7);
    const replaceable = events.filter((event) =>
      event.taskId &&
      event.kind === "task" && !event.cancelled && !event.locked && event.origin === "aevia" &&
      new Date(event.start) >= targetWeek && new Date(event.start) < targetWeekEnd && new Date(event.start) >= now
    );
    const replaceIds = new Set(replaceable.map((event) => event.id));
    const stableEvents = events.filter((event) => !replaceIds.has(event.id));
    const replannedTaskIds = new Set(replaceable.map((event) => event.taskId).filter((id): id is string => Boolean(id)));
    const replannedTasks = tasks.filter((task) => replannedTaskIds.has(task.id) && !task.completed);
    const firstPlan = buildPlan(replannedTasks, stableEvents, plannerPreferences, now, targetWeek);
    const firstUnscheduledIds = new Set(firstPlan.unscheduled);
    const overlapsAddedEvent = (event: CalendarEvent) => {
      const start = new Date(event.start);
      const end = new Date(start.getTime() + event.durationMinutes * 60_000);
      return start < addedEnd && end > addedStart;
    };
    const preservedEvents = replaceable.filter((event) =>
      firstUnscheduledIds.has(event.taskId!) && !overlapsAddedEvent(event)
    );
    const preservedIds = new Set(preservedEvents.map((event) => event.id));
    const plan = preservedEvents.length
      ? buildPlan(replannedTasks, [...stableEvents, ...preservedEvents], plannerPreferences, now, targetWeek)
      : firstPlan;
    const unscheduledIds = new Set(plan.unscheduled);
    const replacements = plan.blocks
      .filter((block) => !unscheduledIds.has(block.task.id))
      .map((block) => ({
        title: block.task.title,
        start: block.start,
        durationMinutes: block.durationMinutes,
        kind: "task" as const,
        taskId: block.task.id,
        project: block.task.project,
        colorIndex: block.task.colorIndex ?? 3,
        origin: "aevia" as const,
      }));
    const displaced = replaceable.filter((event) =>
      !preservedIds.has(event.id) && (!unscheduledIds.has(event.taskId!) || overlapsAddedEvent(event))
    );
    return {
      overlaps,
      conflicts,
      displaced,
      replacements,
      unscheduledTaskTitles: replannedTasks.filter((task) => unscheduledIds.has(task.id)).map((task) => task.title),
    };
  },

  applyConflictReplan: (proposal) => {
    const removeIds = new Set(proposal.displaced.map((event) => event.id));
    set((s) => {
      const usedIds = new Set(s.events.filter((event) => !removeIds.has(event.id)).map((event) => event.id));
      const replacements = proposal.replacements.map((event) => ({
        ...event,
        id: nextEntityId("e", usedIds),
      }));
      return { events: [...s.events.filter((event) => !removeIds.has(event.id)), ...replacements] };
    });
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
      const updatedEvents = s.events
          .map((event) =>
            event.id === eventId
              ? {
                  ...event,
                  ...updates,
                  origin: "user" as const,
                  locked: event.taskId || event.kind === "lunch" ? true : event.locked,
                }
              : event
          );
      return { events: mergeAdjacentTaskBlocks(updatedEvents, eventId) };
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

  toggleComplete: (id) => {
    const task = get().tasks.find((item) => item.id === id);
    if (!task) return;
    const completing = !task.completed;
    const now = Date.now();
    set((s) => ({
      tasks: s.tasks.map((item) =>
        item.id === id ? { ...item, completed: completing, completedAt: completing ? new Date(now).toISOString() : undefined } : item
      ),
      events: s.events.map((event) => {
        if (event.taskId !== id) return event;
        if (completing && event.completionPromptAskedAt && !event.completionPromptResponse) {
          event = { ...event, completionPromptResponse: "done" };
        }
        if (!completing) {
          if (event.cancelledByTaskCompletion) {
            return { ...event, cancelled: false, cancelledByTaskCompletion: undefined };
          }
          if (event.taskCompletionOriginalDurationMinutes !== undefined) {
            return { ...event, durationMinutes: event.taskCompletionOriginalDurationMinutes, taskCompletionOriginalDurationMinutes: undefined };
          }
          return event;
        }
        if (event.cancelled) return event;
        const start = new Date(event.start).getTime();
        const end = start + event.durationMinutes * 60_000;
        if (end <= now) return event;
        if (start >= now) return { ...event, cancelled: true, cancelledByTaskCompletion: true };
        const elapsedMinutes = Math.floor((now - start) / 60_000);
        if (elapsedMinutes < 1) return { ...event, cancelled: true, cancelledByTaskCompletion: true };
        return { ...event, durationMinutes: elapsedMinutes, taskCompletionOriginalDurationMinutes: event.durationMinutes };
      }),
    }));
  },

  markEventPromptAsked: (eventId, prompt) =>
    set((s) => ({
      events: s.events.map((event) => event.id !== eventId ? event : prompt === "focus"
        ? { ...event, focusPromptAskedAt: event.focusPromptAskedAt ?? new Date().toISOString() }
        : { ...event, completionPromptAskedAt: event.completionPromptAskedAt ?? new Date().toISOString() }),
    })),

  respondToEventPrompt: (eventId, prompt, response) =>
    set((s) => ({
      events: s.events.map((event) => event.id !== eventId ? event : prompt === "focus"
        ? { ...event, focusPromptResponse: response as "started" | "skipped" | "expired" }
        : { ...event, completionPromptResponse: response as "done" | "not_done" }),
    })),

  updateTask: (id, updates) =>
    set((s) => ({
      tasks: s.tasks.map((task) => task.id === id ? { ...task, ...updates } : task),
      events: s.events.map((event) => event.taskId === id ? {
        ...event,
        title: updates.title ?? event.title,
        project: updates.project ?? event.project,
        colorIndex: updates.colorIndex ?? event.colorIndex,
      } : event),
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
    (() => {
      let createdEventId: string | undefined;
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
      createdEventId = nextEntityId("e", usedIds);
      const event: CalendarEvent = {
        id: createdEventId,
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
      });
      return createdEventId;
    })(),

  moveEvent: (eventId, dayIndex, startMinutes, baseWeekMs) =>
    set((s) => {
      const event = s.events.find((item) => item.id === eventId);
      if (!event) return s;
      const start = makeIsoAt(dayIndex, startMinutes, baseWeekMs ? new Date(baseWeekMs) : weekStart());
      const movedEvents = s.events.map((item) =>
          item.id === eventId
            ? {
                ...item,
                start,
                origin: "user" as const,
                locked: item.taskId || item.kind === "lunch" ? true : item.locked,
              }
            : item
        );
      return { events: mergeAdjacentTaskBlocks(movedEvents, eventId) };
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
        ids.has(event.id) ? { ...event, cancelled, cancelledByTaskCompletion: undefined } : event
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
  applyPlanPreview: (baseWeekMs, proposedBlocks) => {
    const now = new Date();
    const targetWeek = weekStart(new Date(baseWeekMs));
    const targetWeekEnd = addDays(targetWeek, 7);
    const { tasks, events, plannerPreferences } = get();
    const completedTaskIds = new Set(tasks.filter((task) => task.completed).map((task) => task.id));
    const isManagedEvent = (event: CalendarEvent) => {
      if (event.kind !== "task" || !event.taskId || event.cancelled || completedTaskIds.has(event.taskId) || event.locked || event.origin === "user") return false;
      const start = new Date(event.start);
      return start >= targetWeek && start < targetWeekEnd && start >= now;
    };
    const managedEvents = events.filter(isManagedEvent);
    const stableEvents = events.filter((event) => !isManagedEvent(event));
    const plan = buildPlan(tasks, stableEvents, plannerPreferences, now, targetWeek);
    const unscheduledIds = new Set(plan.unscheduled);
    const currentBlocks = plan.blocks
      .filter((block) => !unscheduledIds.has(block.task.id))
      .map((block) => ({ taskId: block.task.id, start: block.start, durationMinutes: block.durationMinutes }));
    if (JSON.stringify(currentBlocks) !== JSON.stringify(proposedBlocks)) return false;

    const fallbackEvents = managedEvents.filter((event) => event.taskId && unscheduledIds.has(event.taskId));
    set((state) => {
      const usedIds = new Set(state.events.map((event) => event.id));
      return {
        events: [
          ...stableEvents,
          ...fallbackEvents,
          ...plan.blocks.filter((block) => !unscheduledIds.has(block.task.id)).map((block) => ({
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
    return true;
  },
  scheduleUnscheduledTask: (taskId) => {
    const now = new Date();
    const task = get().tasks.find((item) => item.id === taskId && !item.completed);
    if (!task) return { scheduled: false, scheduledMinutes: 0 };

    const targetWeek = planningWeekStart(now);
    get().ensureLunchEvents(targetWeek.getTime());
    const { events, plannerPreferences } = get();
    const plan = buildPlan([task], events, plannerPreferences, now, targetWeek);
    if (plan.unscheduled.includes(taskId) || plan.blocks.length === 0) {
      return { scheduled: false, scheduledMinutes: 0 };
    }

    const usedIds = new Set(events.map((event) => event.id));
    const additions: CalendarEvent[] = plan.blocks.map((block) => ({
      id: nextEntityId("e", usedIds),
      title: block.task.title,
      start: block.start,
      durationMinutes: block.durationMinutes,
      kind: "task",
      project: block.task.project,
      taskId: block.task.id,
      colorIndex: block.task.colorIndex ?? 3,
      origin: "aevia",
    }));
    set((state) => ({ events: [...state.events, ...additions] }));
    return {
      scheduled: true,
      scheduledMinutes: additions.reduce((sum, event) => sum + event.durationMinutes, 0),
    };
  },
}), {
  name: "aevia-plan-store",
  storage: createJSONStorage(() => accountScopedStorage),
  skipHydration: true,
  merge: (persistedState, currentState) => migratePersistedWorkspace(persistedState as Partial<State>, currentState),
}));
