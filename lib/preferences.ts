import type { PlannerPreferences } from "./types";

export const DEFAULT_PLANNER_PREFERENCES: PlannerPreferences = {
  workStartMinutes: 9 * 60,
  workEndMinutes: 18 * 60,
  bufferMinutes: 10,
  lunchStartMinutes: 13 * 60,
  lunchDurationMinutes: 60,
  timezone: "UTC",
};
