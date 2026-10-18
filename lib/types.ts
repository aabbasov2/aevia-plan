export type Recurrence =
  | { kind: "none" }
  | { kind: "daily" }
  | { kind: "weekly"; day?: number }
  | { kind: "monthly"; dayOfMonth?: number }
  | { kind: "monthly-first-week" };

export type ProjectKey =
  | "personal"
  | "university"
  | "work"
  | "aevia"
  | "travel";

export type FocusArtifactStyle = "arc" | "skyline" | "terrain" | "orbit";

export type CalendarEventRecurrence = {
  frequency: "daily" | "weekly" | "monthly";
  interval?: number;
  /** JavaScript weekday numbers (0 = Sunday) for weekly patterns. */
  daysOfWeek?: number[];
  /** Optional day of month; defaults to the event's original day. */
  dayOfMonth?: number;
  /** Inclusive end instant; omitted means the series continues. */
  until?: string;
};

export type Task = {
  id: string;
  title: string;
  durationMinutes: number;
  /** Preferred maximum length of each Aevia-planned focus session. */
  focusBlockMinutes?: number;
  /** Whether the user asked for this task to be split across focus sessions. */
  splitPreference?: boolean;
  deadline?: string; // ISO date
  recurrence: Recurrence;
  project: ProjectKey;
  notes?: string;
  completedAt?: string;
  /** Idempotency link when a captured thought is converted into this task. */
  sourceDistractionId?: string;
  completed?: boolean;
  colorIndex?: number; // 1..6
};

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

export type CalendarEvent = {
  id: string;
  /** Google Calendar event link, when this item is mirrored to/from Google. */
  googleEventId?: string;
  googleCalendarId?: string;
  title: string;
  /** ISO datetime for start */
  start: string;
  /** minutes */
  durationMinutes: number;
  /** Optional all-day marker for imported or manually-created calendar items. */
  allDay?: boolean;
  /** Free items remain visible but do not reserve scheduling capacity. */
  availability?: "busy" | "free";
  /** External invitation response; declined items do not reserve scheduling capacity. */
  responseStatus?: "accepted" | "tentative" | "declined";
  /** Optional repeating schedule; each occurrence uses the event's local wall time. */
  recurrence?: CalendarEventRecurrence;
  /** if this event is a scheduled task, carry its id */
  taskId?: string;
  kind: "meeting" | "focus" | "personal" | "task" | "lunch";
  /** who chose this event's current calendar position */
  origin?: "user" | "aevia";
  project?: ProjectKey;
  colorIndex?: number;
  locked?: boolean;
  /** cancelled events remain visible but no longer reserve planning time */
  cancelled?: boolean;
  /** lets task completion release future time and restore it if the task is reopened */
  cancelledByTaskCompletion?: boolean;
  /** original duration for an in-progress event shortened when its task was completed */
  taskCompletionOriginalDurationMinutes?: number;
  focusPromptAskedAt?: string;
  focusPromptResponse?: "started" | "skipped" | "expired";
  completionPromptAskedAt?: string;
  completionPromptResponse?: "done" | "not_done";
};

export type PlannerPreferences = {
  workStartMinutes: number;
  workEndMinutes: number;
  bufferMinutes: number;
  lunchStartMinutes: number;
  lunchDurationMinutes: number;
  timezone?: string;
};

export type PlanHealth =
  | {
      state: "on-track";
      remainingHours: number;
      availableHours: number;
    }
  | {
      state: "needs-attention";
      remainingHours: number;
      scheduledHours: number;
      unscheduledHours: number;
    }
  | {
      state: "wont-fit";
      shortfallHours: number;
      deadlineLabel: string;
    };

export type CommitmentCadence =
  | { kind: "daily" }
  | { kind: "weekly"; day: number } // 0 = Mon .. 6 = Sun
  | { kind: "monthly"; dayOfMonth: number } // 1..28
  | { kind: "monthly-first-week" }
  | { kind: "quarterly"; month: number; day: number } // month within quarter (0-2)
  | { kind: "yearly"; month: number; day: number }; // month 0..11

export type Commitment = {
  id: string;
  title: string;
  cadence: CommitmentCadence;
  estimatedMinutes?: number;
  project: ProjectKey;
  notes?: string;
  colorIndex?: number;
};

export type InboxItem = {
  id: string;
  source: "email" | "slack" | "manual";
  title: string;
  snippet?: string;
  status: "unprocessed" | "archived" | "dismissed";
  receivedAt: string;
};

export type PlanSuggestion = {
  id: string;
  taskId: string;
  taskTitle: string;
  day: number; // 0 = Monday
  startMinutes: number; // from 00:00 of that day
  durationMinutes: number;
  reason: string;
};
