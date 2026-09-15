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
  deadline?: string; // ISO date
  recurrence: Recurrence;
  project: ProjectKey;
  notes?: string;
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
  kind: "meeting" | "focus" | "personal" | "task";
  project?: ProjectKey;
  colorIndex?: number;
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

export type PlanSuggestion = {
  id: string;
  taskId: string;
  taskTitle: string;
  day: number; // 0 = Monday
  startMinutes: number; // from 00:00 of that day
  durationMinutes: number;
  reason: string;
};
