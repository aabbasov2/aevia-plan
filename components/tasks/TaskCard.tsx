"use client";

import { useDraggable } from "@dnd-kit/core";
import { GripVertical, Repeat } from "lucide-react";
import { addMinutes, format } from "date-fns";
import { blockColor, PROJECTS } from "@/lib/projects";
import { humanDeadline, humanDuration } from "@/lib/time";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/cn";
import { useStore } from "@/lib/store";

function recurrenceLabel(t: Task) {
  switch (t.recurrence.kind) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "monthly-first-week":
      return "First week / month";
    default:
      return null;
  }
}

export function TaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task-${task.id}`,
  });
  const project = PROJECTS[task.project];
  const rec = recurrenceLabel(task);
  const toggle = useStore((s) => s.toggleComplete);
  const events = useStore((s) => s.events);
  const scheduledEvents = events
    .filter((event) => event.taskId === task.id && !event.cancelled)
    .sort((first, second) => first.start.localeCompare(second.start));
  const scheduledMinutes = scheduledEvents.reduce(
    (sum, event) => sum + event.durationMinutes,
    0
  );
  const firstScheduledEvent = scheduledEvents[0];

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "group card flex min-w-0 touch-none items-center gap-3 p-3 transition-all sm:p-4",
        isDragging ? "opacity-40" : "hover:border-[var(--border-strong)]"
      )}
    >
      <div className="cursor-grab text-fg-subtle transition-opacity group-hover:opacity-100 active:cursor-grabbing" aria-label="Drag task">
        <GripVertical size={14} />
      </div>

      <div
        className="h-8 w-1 rounded-full"
        style={{ background: blockColor(task.colorIndex) }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[15px] leading-5 truncate",
              task.completed ? "text-fg-subtle line-through" : "text-fg"
            )}
          >
            {task.title}
          </span>
          {rec && (
            <span className="chip">
              <Repeat size={10} />
              {rec}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 meta">
          <span>{humanDuration(task.durationMinutes)}</span>
          <span aria-hidden="true">·</span>
          <span>{humanDeadline(task.deadline)}</span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: project.dot }}
            />
            {project.label}
          </span>
          {firstScheduledEvent ? (
            <span className="text-[var(--gold-strong)]" title={`${scheduledMinutes} of ${task.durationMinutes} minutes scheduled`}>
              {scheduledMinutes < task.durationMinutes ? "Partly scheduled · " : "Scheduled "}
              {format(new Date(firstScheduledEvent.start), "EEE d MMM, HH:mm")}–{format(addMinutes(new Date(firstScheduledEvent.start), firstScheduledEvent.durationMinutes), "HH:mm")}
              {scheduledEvents.length > 1 ? ` · +${scheduledEvents.length - 1} sessions` : ""}
            </span>
          ) : task.deadline && !task.completed ? (
            <span className="text-[var(--event-user-accent)]">Not scheduled</span>
          ) : null}
        </div>
      </div>

      <button
        onClick={() => toggle(task.id)}
        className="btn btn-ghost h-7 shrink-0 rounded-full px-2 text-[11px] sm:px-3"
      >
        {task.completed ? "Reopen" : "Done"}
      </button>
    </div>
  );
}
