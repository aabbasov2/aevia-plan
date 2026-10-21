"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { addDays, format, startOfDay } from "date-fns";
import { AlertTriangle, ArrowUpRight, CalendarDays, Clock3, RotateCcw, Trash2, X } from "lucide-react";
import { AeviaArc } from "@/components/brand/AeviaArc";
import { DayRecoveryModal } from "@/components/aevia/DayRecoveryModal";
import { useStore } from "@/lib/store";
import type { CalendarEvent, ProjectKey, Task } from "@/lib/types";
import { PROJECTS } from "@/lib/projects";
import { weekStart } from "@/lib/time";
import { buildPlan, planningWeekStart } from "@/lib/planner";
import { calendarEventInterval, findCalendarOverlaps, isBlockingCalendarEvent } from "@/lib/calendar-conflicts";

type PlanPreview = {
  targetWeek: Date;
  blocks: Array<{ task: Task; start: string; durationMinutes: number }>;
  unscheduled: string[];
  replacedEvents: CalendarEvent[];
  keptEvents: CalendarEvent[];
  snapshotKey: string;
};

type CommandResult = {
  intent: "create_task" | "create_event" | "plan_week" | "summarize" | "risks" | "availability" | "recover" | "clarify" | "chat" | "out_of_scope";
  rangeStart?: string;
  rangeEnd?: string;
  eventTitle?: string;
  eventDate?: string;
  eventStartTime?: string;
  eventDurationMinutes?: number;
  eventKind?: "meeting" | "task" | "focus";
  scheduleImmediately?: boolean;
  taskTitle?: string;
  taskDurationMinutes?: number;
  clarification?: string;
  response?: string;
};

type TaskProposal = { type: "task"; title: string; durationMinutes: number; deadlineDate: string; project: ProjectKey; sessionMinutes: number; splitIntoSessions: boolean; scheduleImmediately?: boolean };
type TaskBatchProposal = { type: "task_batch"; title: string; count: number; durationMinutes: number; deadlineDate: string; project: ProjectKey; sessionMinutes: number; splitIntoSessions: boolean };
type EventProposal = { type: "event"; title: string; start: Date; durationMinutes: number; kind: "meeting" | "task" | "focus" };

function localDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateRangeLabel(start: Date, endInclusive: Date) {
  return format(start, "yyyy-MM-dd") === format(endInclusive, "yyyy-MM-dd")
    ? format(start, "EEEE, MMM d")
    : `${format(start, "MMM d")}–${format(endInclusive, "MMM d")}`;
}

function eventsInRange(events: CalendarEvent[], start: Date, end: Date) {
  return events.filter((event) => {
    const at = new Date(event.start);
    return !event.cancelled && at >= start && at < end;
  });
}

function summarizePeriod(tasks: Task[], events: CalendarEvent[], start: Date, end: Date, label: string) {
  const rangeEvents = eventsInRange(events, start, end);
  const taskIds = new Set(rangeEvents.map((event) => event.taskId).filter((id): id is string => Boolean(id)));
  const dueTasks = tasks.filter((task) => task.deadline && new Date(task.deadline) >= start && new Date(task.deadline) < end);
  const periodTasks = Array.from(new Map([...dueTasks, ...tasks.filter((task) => taskIds.has(task.id))].map((task) => [task.id, task])).values());
  const taskMinutes = rangeEvents.filter((event) => event.taskId).reduce((sum, event) => sum + event.durationMinutes, 0);
  const completed = periodTasks.filter((task) => task.completed).length;
  const activeDue = dueTasks.filter((task) => !task.completed).length;
  return `${label}: ${rangeEvents.length} calendar event${rangeEvents.length === 1 ? "" : "s"}, ${taskMinutes ? `${Math.round(taskMinutes / 60 * 10) / 10}h of task time planned` : "no task blocks scheduled"}, ${activeDue} task${activeDue === 1 ? "" : "s"} due, ${completed} completed.`;
}

function riskSummary(tasks: Task[], events: CalendarEvent[], start: Date, end: Date, label: string) {
  const conflicts = findCalendarOverlaps(events, start.getTime(), end.getTime());

  const atRisk = tasks.filter((task) => {
    if (task.completed || !task.deadline) return false;
    const due = new Date(task.deadline);
    if (due < start || due >= end) return false;
    const scheduled = events.filter((event) => event.taskId === task.id && isBlockingCalendarEvent(event) && new Date(event.start) < addDays(startOfDay(due), 1)).reduce((sum, event) => sum + event.durationMinutes, 0);
    return scheduled < task.durationMinutes;
  });

  if (atRisk.length === 0 && conflicts.length === 0) return `${label}: no unscheduled deadline work or calendar overlaps found.`;
  const taskText = atRisk.length ? `${atRisk.length} task${atRisk.length === 1 ? "" : "s"} still need time (${atRisk.slice(0, 3).map((task) => task.title).join(", ")}${atRisk.length > 3 ? ", …" : ""})` : "no deadline tasks need extra time";
  const conflictText = conflicts.length ? `${conflicts.length} calendar overlap${conflicts.length === 1 ? "" : "s"} (${conflicts.slice(0, 2).map(({ first, second }) => `${first.title} / ${second.title}`).join(", ")})` : "no calendar overlaps";
  return `${label}: ${taskText}; ${conflictText}.`;
}

function availabilitySummary(events: CalendarEvent[], preferences: { workStartMinutes: number; workEndMinutes: number; bufferMinutes: number }, start: Date, end: Date, label: string) {
  const slots: Array<{ start: Date; end: Date }> = [];
  for (let day = startOfDay(start); day < end; day = addDays(day, 1)) {
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    const workStart = new Date(day);
    workStart.setMinutes(preferences.workStartMinutes, 0, 0);
    const workEnd = new Date(day);
    workEnd.setMinutes(preferences.workEndMinutes, 0, 0);
    const busy = events
      .filter(isBlockingCalendarEvent)
      .flatMap((event) => {
        const interval = calendarEventInterval(event);
        return interval ? [{ start: new Date(interval.start - preferences.bufferMinutes * 60_000), end: new Date(interval.end + preferences.bufferMinutes * 60_000) }] : [];
      })
      .filter((event) => event.start < workEnd && event.end > workStart)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    let cursor = workStart;
    for (const event of busy) {
      if (event.start > cursor && event.start.getTime() - cursor.getTime() >= 30 * 60_000) slots.push({ start: cursor, end: event.start });
      if (event.end > cursor) cursor = event.end;
    }
    if (workEnd > cursor && workEnd.getTime() - cursor.getTime() >= 30 * 60_000) slots.push({ start: cursor, end: workEnd });
  }
  slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  if (!slots.length) return `${label}: I couldn't find a free 30-minute window during your work hours.`;
  return `${label}: ${slots.slice(0, 4).map((slot) => `${format(slot.start, "EEE HH:mm")}–${format(slot.end, "HH:mm")}`).join(" · ")}${slots.length > 4 ? ` · +${slots.length - 4} more` : ""}.`;
}

export function TodayCommandPanel({ onStartFocus, presentation = "inline" }: { onStartFocus?: (taskId: string, durationMinutes: number, eventId: string) => void; presentation?: "inline" | "window" }) {
  const tasks = useStore((state) => state.tasks);
  const events = useStore((state) => state.events);
  const preferences = useStore((state) => state.plannerPreferences);
  const commitPlanPreview = useStore((state) => state.applyPlanPreview);
  const messages = useStore((state) => state.assistantMessages);
  const appendAssistantMessage = useStore((state) => state.appendAssistantMessage);
  const clearAssistantMessages = useStore((state) => state.clearAssistantMessages);
  const markEventPromptAsked = useStore((state) => state.markEventPromptAsked);
  const respondToEventPrompt = useStore((state) => state.respondToEventPrompt);
  const toggleComplete = useStore((state) => state.toggleComplete);
  const createTask = useStore((state) => state.createTask);
  const createEvent = useStore((state) => state.createEvent);
  const scheduleUnscheduledTask = useStore((state) => state.scheduleUnscheduledTask);
  const setEventKind = useStore((state) => state.setEventKind);
  const [request, setRequest] = useState("");
  const [actionProposal, setActionProposal] = useState<TaskProposal | TaskBatchProposal | EventProposal | null>(null);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryDescription, setRecoveryDescription] = useState("");
  const [planPreview, setPlanPreview] = useState<PlanPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [arcState, setArcState] = useState<"idle" | "thinking" | "finished" | "error">("idle");
  const [windowOpen, setWindowOpen] = useState(false);
  const [promptNow, setPromptNow] = useState(() => Date.now());
  const proactiveSuggestionKey = useRef("");
  const conversationRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const arcStateTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (arcStateTimer.current !== null) window.clearTimeout(arcStateTimer.current);
  }, []);

  useEffect(() => {
    if (!windowOpen || presentation !== "window") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setWindowOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [windowOpen, presentation]);

  function addAssistantMessage(content: string) {
    const clean = content.trim();
    if (clean) appendAssistantMessage({ role: "assistant", content: clean });
  }

  function clearConversation() {
    if (!messages.length || !window.confirm("Clear all messages in Aevia AI?")) return;
    clearAssistantMessages();
    setRequest("");
    setActionProposal(null);
    setPlanPreview(null);
    setRecoveryDescription("");
    setRecoveryOpen(false);
    setArcState("idle");
  }

  useEffect(() => {
    const timer = window.setInterval(() => setPromptNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const recentCutoff = promptNow - 12 * 60 * 60_000;
    for (const event of events) {
      if (event.kind !== "task" || !event.taskId || event.cancelled) continue;
      const task = tasks.find((item) => item.id === event.taskId);
      if (!task || task.completed) continue;
      const start = new Date(event.start).getTime();
      const end = start + event.durationMinutes * 60_000;
      if (event.focusPromptAskedAt && !event.focusPromptResponse && start <= promptNow) {
        respondToEventPrompt(event.id, "focus", "expired");
      } else if (!event.focusPromptAskedAt && start > promptNow && start - promptNow <= 5 * 60_000) {
        markEventPromptAsked(event.id, "focus");
        appendAssistantMessage({ role: "assistant", content: `Your ${task.title} block starts at ${format(new Date(event.start), "HH:mm")}. Would you like to start focus mode?` });
      }
      if (!event.completionPromptAskedAt && end <= promptNow && end > recentCutoff) {
        markEventPromptAsked(event.id, "completion");
        appendAssistantMessage({ role: "assistant", content: `Your ${task.title} block ended at ${format(new Date(end), "HH:mm")}. Is the task done?` });
      }
    }
  }, [events, tasks, promptNow, markEventPromptAsked, respondToEventPrompt, appendAssistantMessage]);

  const pendingEventPrompts: Array<{ type: "focus" | "completion"; event: CalendarEvent; task: Task }> = [];
  for (const event of events) {
    if (!event.taskId || event.cancelled) continue;
    const task = tasks.find((item) => item.id === event.taskId);
    if (!task || task.completed) continue;
    const start = new Date(event.start).getTime();
    if (event.focusPromptAskedAt && !event.focusPromptResponse && start > promptNow) pendingEventPrompts.push({ type: "focus", event, task });
    if (event.completionPromptAskedAt && !event.completionPromptResponse) pendingEventPrompts.push({ type: "completion", event, task });
  }

  function scheduleSnapshotKey() {
    const state = useStore.getState();
    return JSON.stringify({ tasks: state.tasks, events: state.events, preferences: state.plannerPreferences });
  }

  useEffect(() => {
    const scheduledMinutes = new Map<string, number>();
    for (const event of events) {
      if (!event.cancelled && event.taskId && new Date(event.start) >= new Date()) {
        scheduledMinutes.set(event.taskId, (scheduledMinutes.get(event.taskId) ?? 0) + event.durationMinutes);
      }
    }
    const unscheduledTaskIds = tasks
      .filter((task) => !task.completed && (scheduledMinutes.get(task.id) ?? 0) < task.durationMinutes)
      .map((task) => task.id)
      .sort();
    const signature = unscheduledTaskIds.join("|");
    if (signature === proactiveSuggestionKey.current) return;
    proactiveSuggestionKey.current = signature;
    if (unscheduledTaskIds.length) {
      createPlanPreview(planningWeekStart(new Date()), "I noticed some of your tasks still need calendar time. I’ve prepared a schedule preview below; approve it if these blocks work for you.");
    }
  }, [events, tasks]);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [busy, messages.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = request.trim();
    if (!message || busy) return;
    setRequest("");
    setBusy(true);
    if (arcStateTimer.current !== null) window.clearTimeout(arcStateTimer.current);
    setArcState("thinking");
    setPlanPreview(null);
    appendAssistantMessage({ role: "user", content: message });
    let failed = false;
    try {
      const now = new Date();
      const response = await fetch("/api/ai/interpret-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: messages.slice(-12).map((entry) => ({ role: entry.role === "assistant" ? "model" : "user", content: entry.content })),
          context: {
            tasks: tasks.slice(0, 80).map((task) => ({ id: task.id, title: task.title, durationMinutes: task.durationMinutes, deadline: task.deadline ?? null, completed: Boolean(task.completed), project: task.project })),
            events: events.filter((item) => !item.cancelled).slice(0, 120).map((item) => ({ title: item.title, start: item.start, durationMinutes: item.durationMinutes, kind: item.kind, taskId: item.taskId ?? null })),
            preferences,
          },
          today: localDateString(now),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Aevia couldn't understand that request.");
      const command = data as CommandResult;
      const rangeStart = command.rangeStart ? new Date(`${command.rangeStart}T00:00:00`) : null;
      const rangeEnd = command.rangeEnd ? addDays(new Date(`${command.rangeEnd}T00:00:00`), 1) : null;
      const label = rangeStart && rangeEnd ? dateRangeLabel(rangeStart, addDays(rangeEnd, -1)) : "";

      switch (command.intent) {
        case "create_task":
          {
            if (command.scheduleImmediately && command.taskTitle && command.taskDurationMinutes) {
              const durationMinutes = command.taskDurationMinutes;
              setActionProposal({
                type: "task",
                title: command.taskTitle,
                durationMinutes,
                deadlineDate: "",
                project: "work",
                sessionMinutes: Math.min(durationMinutes, 120),
                splitIntoSessions: durationMinutes > 120,
                scheduleImmediately: true,
              });
              addAssistantMessage(`I’ve prepared “${command.taskTitle}” for ${durationMinutes} minutes. Accept once and I’ll add it to Tasks and find an open slot.`);
              break;
            }
            const taskResponse = await fetch("/api/ai/interpret-task", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message,
                history: messages.slice(-12).map((entry) => ({ role: entry.role === "assistant" ? "model" : "user", content: entry.content })),
                today: localDateString(now),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              }),
            });
            const taskData = await taskResponse.json();
            if (!taskResponse.ok) throw new Error(taskData.error ?? "Aevia couldn't prepare that task.");
            if (taskData.needsClarification) {
              addAssistantMessage(taskData.clarification || "How much time do you expect this task to take?");
              break;
            }
            setActionProposal(taskData.taskCount > 1
              ? { type: "task_batch", title: taskData.title, count: taskData.taskCount, durationMinutes: taskData.durationMinutes, deadlineDate: taskData.deadlineDate, project: taskData.project, sessionMinutes: taskData.sessionMinutes, splitIntoSessions: taskData.splitIntoSessions }
              : { type: "task", title: taskData.title, durationMinutes: taskData.durationMinutes, deadlineDate: taskData.deadlineDate, project: taskData.project, sessionMinutes: taskData.sessionMinutes, splitIntoSessions: taskData.splitIntoSessions, scheduleImmediately: command.scheduleImmediately });
            addAssistantMessage(taskData.taskCount > 1
              ? `I’ve prepared ${taskData.taskCount} separate tasks. Review the batch below and accept to add them.`
              : command.scheduleImmediately
                ? "I’ve prepared the task and will place it in the next suitable open slot when you accept."
                : "I’ve prepared this task. Review the details below and accept to add it.");
          }
          break;
        case "create_event": {
          if (!command.eventDate || !command.eventStartTime || !command.eventTitle || !command.eventDurationMinutes) {
            addAssistantMessage(command.clarification || "What date, start time, and duration should I put on your calendar?");
            break;
          }
          setActionProposal({ type: "event", start: new Date(`${command.eventDate}T${command.eventStartTime}:00`), title: command.eventTitle, durationMinutes: command.eventDurationMinutes, kind: command.eventKind ?? "meeting" });
          addAssistantMessage("I’ve prepared this calendar event. Review the details below and accept to add it.");
          break;
        }
        case "plan_week": {
          if (!rangeStart) { addAssistantMessage(command.response || "Which week should I plan?"); break; }
          createPlanPreview(rangeStart, command.response);
          break;
        }
        case "summarize":
          if (rangeStart && rangeEnd) addAssistantMessage(summarizePeriod(tasks, events, rangeStart, rangeEnd, label));
          break;
        case "risks":
          if (rangeStart && rangeEnd) addAssistantMessage(riskSummary(tasks, events, rangeStart, rangeEnd, label));
          break;
        case "availability":
          if (rangeStart && rangeEnd) addAssistantMessage(availabilitySummary(events, preferences, rangeStart, rangeEnd, label));
          break;
        case "recover":
          addAssistantMessage(command.response || "Tell me what changed and I’ll help rework the plan.");
          setRecoveryDescription(message);
          setRecoveryOpen(true);
          break;
        case "clarify":
        case "chat":
        case "out_of_scope":
          addAssistantMessage(command.response || command.clarification || "What would you like to work through?");
          break;
      }
    } catch (error) {
      failed = true;
      addAssistantMessage(error instanceof Error ? error.message : "Aevia couldn't understand that request. Try again.");
    } finally {
      setBusy(false);
      if (arcStateTimer.current !== null) window.clearTimeout(arcStateTimer.current);
      const finalState = failed ? "error" : "finished";
      setArcState(finalState);
      arcStateTimer.current = window.setTimeout(() => setArcState("idle"), finalState === "finished" ? 1200 : 1500);
    }
  }

  function createPlanPreview(targetDate: Date, responseText?: string) {
    const now = new Date();
    const targetWeek = weekStart(targetDate);
    const targetWeekEnd = addDays(targetWeek, 7);
    useStore.getState().ensureLunchEvents(targetWeek.getTime());
    const currentState = useStore.getState();
    const currentTasks = currentState.tasks;
    const currentEvents = currentState.events;
    const currentPreferences = currentState.plannerPreferences;
    const completedIds = new Set(currentTasks.filter((task) => task.completed).map((task) => task.id));
    const managedEvents = currentEvents.filter((event) => {
      if (event.kind !== "task" || !event.taskId || event.cancelled || completedIds.has(event.taskId) || event.locked || event.origin === "user") return false;
      const start = new Date(event.start);
      return start >= targetWeek && start < targetWeekEnd && start >= now;
    });
    const managedIds = new Set(managedEvents.map((event) => event.id));
    const stableEvents = currentEvents.filter((event) => !managedIds.has(event.id));
    const plan = buildPlan(currentTasks, stableEvents, currentPreferences, now, targetWeek);
    const unscheduled = new Set(plan.unscheduled);
    const blocks = plan.blocks.filter((block) => !unscheduled.has(block.task.id));
    const replacedEvents = managedEvents.filter((event) => !event.taskId || !unscheduled.has(event.taskId));
    const keptEvents = managedEvents.filter((event) => Boolean(event.taskId && unscheduled.has(event.taskId)));
    if (responseText) addAssistantMessage(responseText);
    setPlanPreview({ targetWeek, blocks, unscheduled: plan.unscheduled, replacedEvents, keptEvents, snapshotKey: JSON.stringify({ tasks: currentTasks, events: currentEvents, preferences: currentPreferences }) });
  }

  function planToday() {
    addAssistantMessage("I’ll look for solid blocks of time for your unfinished tasks and show you the proposed schedule here.");
    createPlanPreview(planningWeekStart(new Date()));
  }

  function applyPlanPreview() {
    if (!planPreview) return;
    if (planPreview.snapshotKey !== scheduleSnapshotKey()) {
      createPlanPreview(planPreview.targetWeek, "Your calendar changed while this preview was open, so I refreshed the proposed schedule. Review it and approve again.");
      return;
    }
    const approved = commitPlanPreview(
      planPreview.targetWeek.getTime(),
      planPreview.blocks.map((block) => ({ taskId: block.task.id, start: block.start, durationMinutes: block.durationMinutes })),
    );
    if (!approved) {
      createPlanPreview(planPreview.targetWeek, "Your schedule changed while this preview was open, so I refreshed it. Review the updated blocks and approve again.");
      return;
    }
    const result = { scheduledTaskCount: new Set(planPreview.blocks.map((block) => block.task.id)).size, scheduledMinutes: planPreview.blocks.reduce((sum, block) => sum + block.durationMinutes, 0), unscheduled: planPreview.unscheduled };
    const weekLabel = `${format(planPreview.targetWeek, "MMM d")}–${format(addDays(planPreview.targetWeek, 6), "MMM d")}`;
    setPlanPreview(null);
    addAssistantMessage(result.scheduledTaskCount
      ? `Plan applied for ${weekLabel}: ${result.scheduledTaskCount} task${result.scheduledTaskCount === 1 ? "" : "s"} scheduled across ${Math.round(result.scheduledMinutes / 60 * 10) / 10}h.`
      : result.unscheduled.length
        ? `No tasks could be scheduled for ${weekLabel}. Review the tasks that still need time.`
        : `Your plan for ${weekLabel} is up to date.`);
  }

  function summarizeDay() {
    const now = new Date();
    const start = startOfDay(now);
    addAssistantMessage(summarizePeriod(tasks, events, start, addDays(start, 1), "Today"));
  }

  function acceptActionProposal() {
    if (!actionProposal) return;
    if (actionProposal.type === "task" || actionProposal.type === "task_batch") {
      const deadline = actionProposal.deadlineDate ? new Date(`${actionProposal.deadlineDate}T23:59:59`).toISOString() : undefined;
      const count = actionProposal.type === "task_batch" ? actionProposal.count : 1;
      const createdTaskIds: string[] = [];
      for (let index = 0; index < count; index += 1) {
        const taskId = createTask({
          title: count > 1 ? `${actionProposal.title} ${index + 1}` : actionProposal.title,
          durationMinutes: actionProposal.durationMinutes,
          focusBlockMinutes: actionProposal.sessionMinutes,
          splitPreference: actionProposal.splitIntoSessions,
          ...(deadline ? { deadline } : {}),
          recurrence: { kind: "none" },
          project: actionProposal.project,
          colorIndex: 3,
        }, { autoSchedule: false });
        createdTaskIds.push(taskId);
      }
      if (count === 1 && actionProposal.type === "task" && actionProposal.scheduleImmediately) {
        const result = scheduleUnscheduledTask(createdTaskIds[0]);
        const scheduledEvent = useStore.getState().events.find((event) => event.taskId === createdTaskIds[0] && !event.cancelled);
        addAssistantMessage(result.scheduled && scheduledEvent
          ? `Added “${actionProposal.title}” to Tasks and scheduled it for ${format(new Date(scheduledEvent.start), "EEEE, MMM d 'at' HH:mm")}.`
          : `Added “${actionProposal.title}” to Tasks. I couldn’t find a suitable open slot this week, so it remains unscheduled.`);
      } else {
        addAssistantMessage(count > 1
          ? `Added ${count} tasks to Tasks. I’m preparing a schedule preview for the week before the deadline.`
          : `Added “${actionProposal.title}” to Tasks. You can ask me to find time for it whenever you’re ready.`);
      }
    } else {
      const result = createEvent({
        title: actionProposal.title,
        start: actionProposal.start.toISOString(),
        durationMinutes: actionProposal.durationMinutes,
        kind: actionProposal.kind,
        origin: "user",
        project: "work",
        colorIndex: 4,
      });
      if (actionProposal.kind === "task" && result.eventId) setEventKind(result.eventId, "task");
      const createdEvent = result.eventId ? useStore.getState().events.find((event) => event.id === result.eventId) : undefined;
      const createdStart = createdEvent ? new Date(createdEvent.start).getTime() : 0;
      const overlaps = createdEvent ? findCalendarOverlaps(useStore.getState().events, createdStart, createdStart + createdEvent.durationMinutes * 60_000).filter((overlap) => overlap.first.id === result.eventId || overlap.second.id === result.eventId) : [];
      addAssistantMessage(overlaps.length
        ? `Added “${actionProposal.title}” to your calendar. Aevia flagged ${overlaps.length} overlap${overlaps.length === 1 ? "" : "s"}; review the recommendation in Today.`
        : `Added “${actionProposal.title}” to your calendar.`);
    }
    setActionProposal(null);
  }

  function showRisks() {
    const now = new Date();
    const start = weekStart(now);
    addAssistantMessage(riskSummary(tasks, events, start, addDays(start, 7), dateRangeLabel(start, addDays(start, 6))));
  }

  function choosePrompt(prompt: string) {
    setRequest(prompt);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  const welcomePrompts = [
    { label: "Plan my day", description: "Build a balanced schedule", icon: <CalendarDays size={15} />, prompt: "Plan my day" },
    { label: "Find time for a task", description: "Fit focused work into your week", icon: <Clock3 size={15} />, prompt: "Find time for a task" },
    { label: "Check for conflicts", description: "Review overlaps and risks", icon: <AlertTriangle size={15} />, prompt: "Check my calendar for conflicts this week" },
    { label: "Prepare for next week", description: "See what can fit ahead", icon: <RotateCcw size={15} />, prompt: "Plan my tasks for next week" },
  ];

  if (presentation === "window" && !windowOpen) {
    return <>
      <button type="button" onClick={() => setWindowOpen(true)} className="fixed bottom-5 right-5 z-40 inline-flex h-12 items-center gap-2.5 rounded-full border border-[#dfc08c]/30 bg-[#171513]/95 px-4 text-[12px] font-medium text-[#f0e6d7] shadow-[0_10px_36px_rgba(0,0,0,.45)] backdrop-blur-xl transition hover:border-[#dfc08c]/60 hover:bg-[#211e19] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#dfc08c]">
        <AeviaArc size={22} /> Aevia AI <span className="sr-only">Open assistant window</span>
      </button>
      <DayRecoveryModal open={recoveryOpen} onOpenChange={setRecoveryOpen} initialDescription={recoveryDescription} />
    </>;
  }

  const panel = <section
    role={presentation === "window" ? "dialog" : undefined}
    aria-modal={presentation === "window" ? true : undefined}
    aria-labelledby="aevia-ai-title"
    className={presentation === "window"
      ? "fixed inset-y-3 right-3 z-[61] flex w-[min(500px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[22px] border border-white/[0.12] bg-[linear-gradient(155deg,rgba(23,22,21,.98),rgba(12,13,16,.98)_68%)] text-fg shadow-[0_28px_100px_rgba(0,0,0,.65)] backdrop-blur-2xl sm:inset-y-5 sm:right-5 sm:w-[min(520px,calc(100vw-2.5rem))]"
      : "today-card overflow-hidden rounded-2xl"}
  >
      <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.09] px-5 py-4 sm:px-6">
        <AeviaArc size={28} state={busy ? "thinking" : arcState} />
        <div className="min-w-0 flex-1"><h2 id="aevia-ai-title" className="text-[17px] font-medium text-[#f2eadd]">Aevia AI</h2><p className="text-[10px] text-white/45">Your planning assistant</p></div>
        <span aria-live="polite" className={`text-[10px] ${arcState === "error" ? "text-[#c98c82]" : "text-white/40"}`}>{busy ? "Thinking…" : arcState === "error" ? "Couldn't respond" : arcState === "finished" ? "Responded" : "Ready"}</span>
        {messages.length > 0 && <button type="button" onClick={clearConversation} disabled={busy} className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-white/45 transition hover:bg-white/[0.07] hover:text-white/85 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Clear Aevia AI conversation" title={busy ? "Wait for Aevia to finish before clearing" : "Clear conversation"}><Trash2 size={14} /><span className="hidden text-[10px] sm:inline">Clear</span></button>}
        {presentation === "window" && <button type="button" onClick={() => setWindowOpen(false)} className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-white/55 transition hover:bg-white/[0.08] hover:text-white" aria-label="Close Aevia AI"><X size={16} /></button>}
      </div>
      <div className={presentation === "window" ? "flex min-h-0 flex-1 flex-col px-4 pb-4 pt-4 sm:px-5" : "p-5 sm:p-6"}>
        <div ref={conversationRef} className={presentation === "window" ? "min-h-0 flex-1 space-y-3 overflow-y-auto px-0.5 pb-4" : "max-h-[360px] space-y-3 overflow-y-auto pr-1"} aria-live="polite">
          {messages.length === 0 && <div className="flex min-h-full flex-col justify-center py-5">
            <div className="mx-auto flex max-w-[350px] flex-col items-center text-center">
              <AeviaArc size={54} className="mb-5" />
              <h3 className="serif text-[25px] leading-tight text-[#f0e6d7]">How can I help you today?</h3>
              <p className="mt-2 max-w-[310px] text-[12px] leading-5 text-white/50">Plan, resolve conflicts, and find time for what matters.</p>
            </div>
            <div className="mx-auto mt-8 grid w-full max-w-[390px] grid-cols-1 gap-2 sm:grid-cols-2">
              {welcomePrompts.map((item) => <button key={item.label} type="button" onClick={() => item.label === "Plan my day" ? planToday() : item.label === "Check for conflicts" ? showRisks() : choosePrompt(item.prompt)} className="group flex min-h-[58px] items-center gap-3 rounded-xl border border-white/[0.09] bg-white/[0.025] px-3.5 py-2.5 text-left transition hover:border-[#dfc08c]/35 hover:bg-[#dfc08c]/[0.06]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#dfc08c]/15 bg-[#dfc08c]/[0.07] text-[#e8c68f]">{item.icon}</span>
                <span className="min-w-0"><span className="block text-[11px] font-medium text-white/85">{item.label}</span><span className="mt-0.5 block text-[9px] leading-4 text-white/40">{item.description}</span></span>
                <ArrowUpRight size={13} className="ml-auto shrink-0 text-white/25 transition group-hover:text-[#e8c68f]" />
              </button>)}
            </div>
          </div>}
          {messages.map((message) => <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[92%] whitespace-pre-wrap rounded-[16px] px-3.5 py-3 text-[12px] leading-[1.65] ${message.role === "user" ? "rounded-tr-[5px] border border-white/[0.06] bg-white/[0.09] text-[#f0e8dd]" : "rounded-tl-[5px] border border-white/[0.045] bg-[#111216]/90 text-white/65"}`}>{message.role === "assistant" && <AeviaArc size={12} className="mr-1.5 inline align-[-2px]" />}{message.content}</div>
          </div>)}
          {actionProposal && <div className="mx-1 overflow-hidden rounded-2xl border border-[#e5c58e]/20 bg-[#111216]/85 shadow-[0_12px_40px_rgba(0,0,0,.2)]" aria-live="polite">
            <div className="flex items-start gap-2 border-b border-white/[0.07] px-4 py-3.5"><AeviaArc size={17} className="mt-0.5" /><div><p className="text-[12px] font-medium text-[#f0e6d7]">Review proposed {actionProposal.type === "task_batch" ? `${actionProposal.count} tasks` : actionProposal.type === "task" ? "task" : "calendar event"}</p><p className="mt-0.5 text-[10px] text-white/45">Accept to add it to Aevia.</p></div></div>
            <div className="space-y-2 px-4 py-3.5 text-[11px]"><p className="font-medium text-[#f2eadd]">{actionProposal.title}</p>
              {actionProposal.type === "task" || actionProposal.type === "task_batch" ? <><p className="text-white/55">{actionProposal.type === "task_batch" ? `${actionProposal.count} tasks · ` : "Task · "}{actionProposal.durationMinutes} min{actionProposal.type === "task_batch" ? ` each · ${Math.round(actionProposal.count * actionProposal.durationMinutes / 60 * 10) / 10}h total` : ""} · {PROJECTS[actionProposal.project].label}</p>{actionProposal.type === "task_batch" && <div className="max-h-28 overflow-y-auto rounded-lg border border-white/[0.07] px-2.5 py-1 text-[10px] text-white/55">{Array.from({ length: actionProposal.count }, (_, index) => <p key={index} className="py-1">{actionProposal.title} {index + 1}</p>)}</div>}{actionProposal.deadlineDate && <p className="text-white/55">Due {format(new Date(`${actionProposal.deadlineDate}T12:00:00`), "EEE, MMM d, yyyy")}</p>}{actionProposal.type === "task" && actionProposal.scheduleImmediately && <p className="text-[#e5c58e]">Add to Tasks and schedule in the next suitable open slot</p>}</>
                : <><p className="text-white/55">{actionProposal.kind[0].toUpperCase() + actionProposal.kind.slice(1)} · {format(actionProposal.start, "EEE, MMM d · HH:mm")} · {actionProposal.durationMinutes} min</p>{(() => {
                  const proposed: CalendarEvent = { id: "proposed-ai-event", title: actionProposal.title, start: actionProposal.start.toISOString(), durationMinutes: actionProposal.durationMinutes, kind: actionProposal.kind, origin: "user" };
                  const overlaps = findCalendarOverlaps([...events, proposed], actionProposal.start.getTime(), actionProposal.start.getTime() + actionProposal.durationMinutes * 60_000).filter((overlap) => overlap.first.id === proposed.id || overlap.second.id === proposed.id);
                  return overlaps.length ? <div className="rounded-xl border border-[#d77968]/20 bg-[#a54034]/[0.1] px-3 py-2.5 text-[10px] text-[#e6b2a4]"><p>Aevia flagged {overlaps.length} overlap{overlaps.length === 1 ? "" : "s"}. This event will be added at the time you requested.</p>{overlaps.map((overlap) => <p key={overlap.key} className="mt-1.5">{overlap.first.title} / {overlap.second.title} · {format(new Date(overlap.start), "HH:mm")}–{format(new Date(overlap.end), "HH:mm")} · {overlap.recommendation}</p>)}</div> : null;
                })()}</>}
            </div>
            <div className="flex justify-end gap-2 border-t border-white/[0.07] px-4 py-3"><button type="button" className="btn h-8 px-3 text-[10px]" onClick={() => setActionProposal(null)}>Dismiss</button><button type="button" className="btn btn-gold h-8 px-3 text-[10px]" onClick={acceptActionProposal}>Accept and add <ArrowUpRight size={12} /></button></div>
          </div>}
          {pendingEventPrompts.map(({ type, event, task }) => <div key={`${type}-${event.id}`} className="mx-1 rounded-xl border border-[#e5c58e]/15 bg-[#151519]/90 px-3.5 py-3 text-[12px] leading-5 text-[#e8dfd2]"><div className="flex items-start gap-2"><AeviaArc size={15} className="mt-1" /><p>{type === "focus" ? `Focus block · ${task.title} at ${format(new Date(event.start), "HH:mm")}` : `${task.title} block ended at ${format(new Date(new Date(event.start).getTime() + event.durationMinutes * 60_000), "HH:mm")}`}</p></div><div className="mt-2 flex flex-wrap gap-2 pl-5">{type === "focus" ? <><button type="button" className="btn btn-gold h-7 px-2.5 text-[10px]" onClick={() => { respondToEventPrompt(event.id, "focus", "started"); onStartFocus?.(task.id, event.durationMinutes, event.id); }}>Start focus</button><button type="button" className="btn h-7 px-2.5 text-[10px]" onClick={() => respondToEventPrompt(event.id, "focus", "skipped")}>Not now</button></> : <><button type="button" className="btn btn-gold h-7 px-2.5 text-[10px]" onClick={() => { respondToEventPrompt(event.id, "completion", "done"); toggleComplete(task.id); }}>Yes, mark done</button><button type="button" className="btn h-7 px-2.5 text-[10px]" onClick={() => respondToEventPrompt(event.id, "completion", "not_done")}>Not yet</button></>}</div></div>)}
          {busy && <div className="flex justify-start"><div className="inline-flex items-center gap-2 rounded-xl rounded-tl-sm border border-white/[0.05] bg-[#111216]/90 px-3.5 py-3 text-[11px] text-white/55"><AeviaArc size={18} state="thinking" />Thinking through your schedule…</div></div>}
        </div>

        {messages.length > 0 && <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {["Find time for a task", "Check for conflicts", "Summarize today", "My day changed"].map((prompt) => <button key={prompt} type="button" onClick={() => prompt === "Check for conflicts" ? showRisks() : prompt === "Summarize today" ? summarizeDay() : prompt === "My day changed" ? (setRecoveryDescription(""), setRecoveryOpen(true)) : choosePrompt(prompt)} className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-[9px] text-white/55 transition hover:border-[#dfc08c]/30 hover:text-[#f0e6d7]">{prompt}</button>)}
        </div>}

        {planPreview && <PlanPreviewCard preview={planPreview} tasks={tasks} onApply={applyPlanPreview} onCancel={() => setPlanPreview(null)} />}
        <form onSubmit={handleSubmit} className="mt-2 flex shrink-0 items-center gap-2 rounded-[15px] border border-white/[0.1] bg-[#0b0c0f]/90 p-2 pl-3.5 shadow-[0_4px_22px_rgba(0,0,0,.18)] transition focus-within:border-[#dfc08c]/35">
          <input ref={inputRef} value={request} onChange={(event) => setRequest(event.target.value)} className="min-w-0 flex-1 bg-transparent py-1 text-[11px] text-fg outline-none placeholder:text-white/35" placeholder={busy ? "Aevia is thinking…" : messages.length ? "Ask a follow-up…" : "Ask Aevia anything…"} aria-label="Ask Aevia about your schedule" />
          <button disabled={!request.trim() || busy || Boolean(actionProposal)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(145deg,#eed0a2,#b9824c)] text-[#17120c] shadow-[0_2px_10px_rgba(221,174,112,.22)] transition hover:brightness-110 disabled:opacity-45" aria-label="Send request to Aevia">{busy ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" /> : <ArrowUpRight size={16} />}</button>
        </form>
      </div>
    </section>;

  return <>
    {presentation === "window" && createPortal(<button type="button" aria-label="Close Aevia AI window" onClick={() => setWindowOpen(false)} className="fixed inset-0 z-[60] cursor-default bg-black/55 backdrop-blur-[2px]" />, document.body)}
    {presentation === "window" ? createPortal(panel, document.body) : panel}
    <DayRecoveryModal open={recoveryOpen} onOpenChange={setRecoveryOpen} initialDescription={recoveryDescription} />
  </>;
}

function PlanPreviewCard({ preview, tasks, onApply, onCancel }: {
  preview: PlanPreview;
  tasks: Task[];
  onApply: () => void;
  onCancel: () => void;
}) {
  const unscheduledTasks = tasks.filter((task) => preview.unscheduled.includes(task.id));
  const plannedHours = Math.round(preview.blocks.reduce((sum, block) => sum + block.durationMinutes, 0) / 60 * 10) / 10;
  const hasChanges = preview.blocks.length > 0 || preview.replacedEvents.length > 0;
  return <div className="mt-4 overflow-hidden rounded-xl border border-[var(--gold)]/30 bg-[var(--surface)]" aria-live="polite">
    <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-3.5 py-3">
      <div><p className="text-[12px] font-medium text-fg">Review schedule changes</p><p className="mt-0.5 text-[10px] text-fg-muted">{format(preview.targetWeek, "MMM d")}–{format(addDays(preview.targetWeek, 6), "MMM d")} · {preview.blocks.length} new blocks · {plannedHours}h</p></div>
      <span className="rounded-full bg-[var(--gold-soft)] px-2 py-1 text-[9px] text-gold">Preview</span>
    </div>
    <div className="max-h-64 space-y-3 overflow-y-auto px-3.5 py-3">
      <section>
        <p className="text-[10px] font-medium text-fg">Will be scheduled ({preview.blocks.length})</p>
        {preview.blocks.length ? <div className="mt-1 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
          {preview.blocks.map((block, index) => <div key={`${block.task.id}-${block.start}-${index}`} className="flex items-center justify-between gap-3 px-2.5 py-2 text-[10px]">
            <span className="min-w-0 truncate text-fg">{block.task.title}</span>
            <span className="shrink-0 text-fg-muted">{format(new Date(block.start), "EEE, MMM d · HH:mm")} · {block.durationMinutes}m</span>
          </div>)}
        </div> : <p className="mt-1 text-[9px] text-fg-subtle">No new task blocks will be added.</p>}
      </section>
      <section>
        <p className="text-[10px] font-medium text-fg">Current Aevia blocks to replace ({preview.replacedEvents.length})</p>
        {preview.replacedEvents.length ? <div className="mt-1 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
          {preview.replacedEvents.map((event) => <div key={event.id} className="flex items-center justify-between gap-3 px-2.5 py-2 text-[10px]">
            <span className="min-w-0 truncate text-fg">{event.title}</span>
            <span className="shrink-0 text-fg-muted">{format(new Date(event.start), "EEE, MMM d · HH:mm")} · {event.durationMinutes}m</span>
          </div>)}
        </div> : <p className="mt-1 text-[9px] text-fg-subtle">None.</p>}
      </section>
      {unscheduledTasks.length > 0 && <section className="rounded-lg border border-[#e6a07d]/20 bg-[#e6a07d]/5 p-2.5">
        <p className="text-[10px] font-medium text-[#e6a07d]">Still needs time ({unscheduledTasks.length})</p>
        <p className="mt-1 text-[9px] leading-4 text-fg-muted">No new blocks were found for these tasks this week:</p>
        <p className="mt-1 text-[10px] text-fg">{unscheduledTasks.map((task) => task.title).join(", ")}</p>
        {preview.keptEvents.length > 0 && <>
          <p className="mt-2 text-[9px] leading-4 text-fg-muted">Their existing blocks will stay:</p>
          <div className="mt-1 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
            {preview.keptEvents.map((event) => <div key={event.id} className="flex items-center justify-between gap-3 px-2.5 py-2 text-[10px]">
              <span className="min-w-0 truncate text-fg">{event.title}</span>
              <span className="shrink-0 text-fg-muted">{format(new Date(event.start), "EEE, MMM d · HH:mm")} · {event.durationMinutes}m</span>
            </div>)}
          </div>
        </>}
      </section>}
    </div>
    <p className="border-t border-[var(--border)] px-3.5 py-2 text-[9px] leading-4 text-fg-subtle">Meetings, manually placed blocks, and locked blocks stay as they are.</p>
    <div className="flex justify-end gap-2 border-t border-[var(--border)] px-3.5 py-2.5">
      <button type="button" className="btn h-7 px-2.5 text-[10px]" onClick={onCancel}>Keep current plan</button>
      <button type="button" className="btn btn-gold h-7 px-2.5 text-[10px] disabled:opacity-40" onClick={onApply} disabled={!hasChanges}>Apply these changes</button>
    </div>
  </div>;
}
