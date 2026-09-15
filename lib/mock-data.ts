import { addDays } from "date-fns";
import type { CalendarEvent, Commitment, Task } from "./types";
import { weekStart } from "./time";

const ws = weekStart();

function at(dayIndex: number, hour: number, minute = 0): string {
  const d = addDays(ws, dayIndex);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function deadline(dayIndex: number, hour = 18): string {
  const d = addDays(ws, dayIndex);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const initialTasks: Task[] = [
  {
    id: "t1",
    title: "Finish Sustainability Project",
    durationMinutes: 360,
    deadline: deadline(4),
    recurrence: { kind: "none" },
    project: "university",
    colorIndex: 3,
    notes: "Final write-up and citations.",
  },
  {
    id: "t2",
    title: "Document Filing",
    durationMinutes: 120,
    recurrence: { kind: "monthly-first-week" },
    project: "work",
    colorIndex: 1,
  },
  {
    id: "t3",
    title: "Presentation Review",
    durationMinutes: 90,
    deadline: deadline(3),
    recurrence: { kind: "none" },
    project: "work",
    colorIndex: 4,
  },
  {
    id: "t4",
    title: "Weekly Reading",
    durationMinutes: 60,
    recurrence: { kind: "weekly" },
    project: "personal",
    colorIndex: 6,
  },
  {
    id: "t5",
    title: "Aevia Roadmap Draft",
    durationMinutes: 180,
    deadline: deadline(4),
    recurrence: { kind: "none" },
    project: "aevia",
    colorIndex: 5,
  },
  {
    id: "t6",
    title: "Book flights for December trip",
    durationMinutes: 45,
    deadline: deadline(2),
    recurrence: { kind: "none" },
    project: "travel",
    colorIndex: 2,
  },
  {
    id: "t7",
    title: "Weekly review",
    durationMinutes: 30,
    recurrence: { kind: "weekly" },
    project: "personal",
    colorIndex: 6,
  },
  {
    id: "t8",
    title: "Prepare thesis outline",
    durationMinutes: 240,
    deadline: deadline(4, 17),
    recurrence: { kind: "none" },
    project: "university",
    colorIndex: 3,
  },
  {
    id: "t9",
    title: "Send status report",
    durationMinutes: 30,
    recurrence: { kind: "weekly" },
    project: "work",
    colorIndex: 4,
    completed: true,
  },
  {
    id: "t10",
    title: "Refactor onboarding flow",
    durationMinutes: 180,
    deadline: deadline(1),
    recurrence: { kind: "none" },
    project: "aevia",
    colorIndex: 5,
  },
];

export const initialEvents: CalendarEvent[] = [
  {
    id: "e1",
    title: "Team sync",
    start: at(0, 9, 0),
    durationMinutes: 60,
    kind: "meeting",
    project: "work",
    colorIndex: 4,
  },
  {
    id: "e2",
    title: "Gym",
    start: at(2, 8, 0),
    durationMinutes: 60,
    kind: "personal",
    project: "personal",
    colorIndex: 5,
  },
  {
    id: "e3",
    title: "Design Review",
    start: at(1, 11, 30),
    durationMinutes: 60,
    kind: "meeting",
    project: "work",
    colorIndex: 4,
  },
  {
    id: "e4",
    title: "Follow up with Gary",
    start: at(3, 13, 30),
    durationMinutes: 30,
    kind: "meeting",
    project: "work",
    colorIndex: 6,
  },
  {
    id: "e5",
    title: "Sustainability Research",
    start: at(0, 10, 0),
    durationMinutes: 90,
    kind: "task",
    project: "university",
    taskId: "t1",
    colorIndex: 3,
  },
  {
    id: "e6",
    title: "University Project",
    start: at(1, 13, 0),
    durationMinutes: 120,
    kind: "task",
    project: "university",
    taskId: "t8",
    colorIndex: 3,
  },
  {
    id: "e7",
    title: "Aevia Roadmap Draft",
    start: at(2, 14, 0),
    durationMinutes: 90,
    kind: "task",
    project: "aevia",
    taskId: "t5",
    colorIndex: 5,
  },
];

export const initialCommitments: Commitment[] = [
  {
    id: "c1",
    title: "Pay rent",
    cadence: { kind: "monthly", dayOfMonth: 1 },
    estimatedMinutes: 15,
    project: "personal",
    colorIndex: 1,
  },
  {
    id: "c2",
    title: "Team status report",
    cadence: { kind: "weekly", day: 4 }, // Friday
    estimatedMinutes: 30,
    project: "work",
    colorIndex: 4,
    notes: "Summarize what shipped and what's next.",
  },
  {
    id: "c3",
    title: "Compliance filing",
    cadence: { kind: "monthly-first-week" },
    estimatedMinutes: 120,
    project: "work",
    colorIndex: 4,
  },
  {
    id: "c4",
    title: "Quarterly business review",
    cadence: { kind: "quarterly", month: 2, day: 15 },
    estimatedMinutes: 180,
    project: "work",
    colorIndex: 4,
  },
  {
    id: "c5",
    title: "Annual health checkup",
    cadence: { kind: "yearly", month: 10, day: 3 },
    estimatedMinutes: 90,
    project: "personal",
    colorIndex: 1,
  },
  {
    id: "c6",
    title: "Weekly reflection",
    cadence: { kind: "weekly", day: 6 }, // Sunday
    estimatedMinutes: 30,
    project: "personal",
    colorIndex: 6,
  },
];
