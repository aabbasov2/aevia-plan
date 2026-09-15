import type { PlanSuggestion, Task } from "./types";

export function buildSuggestions(tasks: Task[]): PlanSuggestion[] {
  // Simple deterministic mock suggestions for unfinished, deadlined tasks
  const candidates = tasks.filter((t) => !t.completed && t.deadline);
  const slots: Array<{ day: number; start: number }> = [
    { day: 3, start: 16 * 60 }, // Thu 16:00
    { day: 4, start: 9 * 60 }, // Fri 09:00
    { day: 2, start: 15 * 60 }, // Wed 15:00
    { day: 1, start: 16 * 60 }, // Tue 16:00
  ];
  return candidates.slice(0, 3).map((t, i) => ({
    id: `sug-${t.id}`,
    taskId: t.id,
    taskTitle: t.title,
    day: slots[i % slots.length].day,
    startMinutes: slots[i % slots.length].start,
    durationMinutes: Math.min(t.durationMinutes, 120),
    reason:
      i === 0
        ? "Deadline is closest — protects afternoon focus."
        : i === 1
        ? "Uses your quietest morning block."
        : "Fills an open mid-week slot.",
  }));
}
