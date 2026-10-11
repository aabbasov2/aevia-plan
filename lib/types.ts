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

export type Task = {
  id: string;
  title: string;
  durationMinutes: number;
  /** Preferred maximum length of each Aevia-planned focus session. */
  focusBlockMinutes?: number;
  deadline?: string; // ISO date
  recurrence: Recurrence;
  project: ProjectKey;
  notes?: string;
  /** Idempotency link when a captured thought is converted into this task. */
  sourceDistractionId?: string;
  completed?: boolean;
  colorIndex?: number; // 1..6
};

export type CalendarEvent = {
  id: string;
  title: string;
  /** ISO datetime for start */
  start: string;
  /** minutes */
  durationMinutes: number;
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
