export type FocusSessionKind = "focus" | "break";
export type FocusSessionStatus = "running" | "paused" | "completed" | "ended";

export type FocusSession = {
  id: string;
  kind: FocusSessionKind;
  taskId?: string;
  taskTitle?: string;
  durationMinutes: number;
  startedAt: number;
  status: FocusSessionStatus;
  targetEndAt: number | null;
  lastResumedAt: number | null;
  remainingMs: number | null;
  focusedMs: number;
  endedAt?: number;
};

export type CapturedDistraction = {
  id: string;
  text: string;
  createdAt: number;
  category?: "task" | "note" | "idea" | "thought";
  sessionId?: string;
  taskId?: string;
  status: "unprocessed" | "later" | "converted" | "dismissed";
  convertedTaskId?: string;
};

export function recordFocusSession(history: FocusSession[], session: FocusSession): FocusSession[] {
  return [session, ...history.filter((item) => item.id !== session.id)];
}

export function remainingMilliseconds(session: FocusSession, now = Date.now()): number {
  if (session.status === "paused") return Math.max(0, session.remainingMs ?? 0);
  if (session.status !== "running" || session.targetEndAt === null) return 0;
  return Math.max(0, session.targetEndAt - now);
}

export function focusedMilliseconds(session: FocusSession, now = Date.now()): number {
  if (session.kind !== "focus") return 0;
  if (session.status !== "running" || session.lastResumedAt === null) {
    return Math.min(session.durationMinutes * 60_000, Math.max(0, session.focusedMs));
  }
  const stopAt = Math.min(now, session.targetEndAt ?? now);
  const liveElapsed = Math.max(0, stopAt - session.lastResumedAt);
  return Math.min(session.durationMinutes * 60_000, Math.max(0, session.focusedMs + liveElapsed));
}

export function pauseFocusSession(session: FocusSession, now = Date.now()): FocusSession {
  if (session.status !== "running") return session;
  return {
    ...session,
    status: "paused",
    remainingMs: remainingMilliseconds(session, now),
    focusedMs: focusedMilliseconds(session, now),
    lastResumedAt: null,
    targetEndAt: null,
  };
}

export function resumeFocusSession(session: FocusSession, now = Date.now()): FocusSession {
  if (session.status !== "paused") return session;
  const remainingMs = Math.max(0, session.remainingMs ?? 0);
  return {
    ...session,
    status: "running",
    remainingMs: null,
    lastResumedAt: now,
    targetEndAt: now + remainingMs,
  };
}

export function completeFocusSession(session: FocusSession, now = Date.now(), allowEarly = false): FocusSession {
  if (session.status !== "running" && session.status !== "paused") return session;
  if (!allowEarly && session.status === "running" && remainingMilliseconds(session, now) > 0) return session;
  if (!allowEarly && session.status === "paused" && (session.remainingMs ?? 0) > 0) return session;
  const completedAt = allowEarly ? now : (session.targetEndAt ?? now);
  return {
    ...session,
    status: "completed",
    focusedMs: session.kind === "focus" ? focusedMilliseconds(session, completedAt) : 0,
    remainingMs: 0,
    lastResumedAt: null,
    targetEndAt: null,
    endedAt: completedAt,
  };
}

export function endFocusSession(session: FocusSession, now = Date.now()): FocusSession {
  if (session.status !== "running" && session.status !== "paused") return session;
  return {
    ...session,
    status: "ended",
    focusedMs: session.kind === "focus" ? focusedMilliseconds(session, now) : 0,
    remainingMs: 0,
    lastResumedAt: null,
    targetEndAt: null,
    endedAt: now,
  };
}
