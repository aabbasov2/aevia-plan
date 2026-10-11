import type { CalendarEvent } from "./types";

export type DisruptionInterpretation = {
  kind: "unavailable_window" | "meeting_overrun" | "clarification";
  date: string;
  startTime: string;
  endTime: string;
  eventId: string;
  newEndTime: string;
  summary: string;
  clarification: string;
};

export type DayRecoveryProposal = {
  reason: string;
  weekStartMs: number;
  removedEvents: CalendarEvent[];
  updatedEvents: Array<Pick<CalendarEvent, "id" | "start" | "durationMinutes">>;
  addedEvents: Array<Omit<CalendarEvent, "id">>;
  proposedTaskEvents: Array<Omit<CalendarEvent, "id">>;
  atRiskTaskTitles: string[];
};
