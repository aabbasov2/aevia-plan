"use client";

import { useStore } from "@/lib/store";
import { TaskCard } from "@/components/tasks/TaskCard";
import { AeviaArc } from "@/components/brand/AeviaArc";

export function UnscheduledTasksRail() {
  const tasks = useStore((s) => s.tasks);
  const events = useStore((s) => s.events);

  const scheduledMinutesByTask = new Map<string, number>();
  for (const e of events) {
    if (e.taskId) {
      scheduledMinutesByTask.set(
        e.taskId,
        (scheduledMinutesByTask.get(e.taskId) ?? 0) + e.durationMinutes
      );
    }
  }

  const unscheduled = tasks.filter((t) => {
    if (t.completed) return false;
    const scheduled = scheduledMinutesByTask.get(t.id) ?? 0;
    return scheduled < t.durationMinutes;
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="wordmark text-[11px] text-fg-muted">TO SCHEDULE</div>
          <p className="mt-1 text-fg-muted text-[12px]">Drag onto the calendar.</p>
        </div>
        <span className="text-fg-subtle text-[11px]">{unscheduled.length}</span>
      </div>
      {unscheduled.length === 0 ? (
        <div className="card flex flex-col items-center py-8 text-center">
          <AeviaArc size={22} />
          <div className="mt-3 text-fg text-[13px]">Everything is scheduled.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {unscheduled.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </div>
      )}
    </div>
  );
}
