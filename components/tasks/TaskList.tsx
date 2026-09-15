"use client";

import { useMemo } from "react";
import { addDays, isAfter, isBefore } from "date-fns";
import { useStore } from "@/lib/store";
import { TaskCard } from "./TaskCard";
import { weekStart } from "@/lib/time";
import type { Task } from "@/lib/types";
import { AeviaArc } from "@/components/brand/AeviaArc";

export function TaskList() {
  const tasks = useStore((s) => s.tasks);

  const groups = useMemo(() => {
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const endOfWeek = addDays(weekStart(now), 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const today: Task[] = [];
    const thisWeek: Task[] = [];
    const later: Task[] = [];
    const recurring: Task[] = [];
    const completed: Task[] = [];

    for (const t of tasks) {
      if (t.completed) {
        completed.push(t);
        continue;
      }
      if (!t.deadline) {
        if (t.recurrence.kind !== "none") recurring.push(t);
        else later.push(t);
        continue;
      }
      const d = new Date(t.deadline);
      if (isBefore(d, endOfToday)) today.push(t);
      else if (isBefore(d, endOfWeek)) thisWeek.push(t);
      else later.push(t);
    }

    return { today, thisWeek, later, recurring, completed };
  }, [tasks]);

  if (tasks.length === 0) return <EmptyState />;

  return (
    <div className="space-y-8">
      <Section label="Today" items={groups.today} />
      <Section label="This week" items={groups.thisWeek} />
      <Section label="Recurring" items={groups.recurring} />
      <Section label="Later" items={groups.later} />
      {groups.completed.length > 0 && (
        <Section label="Completed" items={groups.completed} />
      )}
    </div>
  );
}

function Section({ label, items }: { label: string; items: Task[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="wordmark text-[11px] text-fg-muted">{label}</h3>
        <span className="text-fg-subtle text-[11px]">{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.map((t) => (
          <TaskCard key={t.id} task={t} />
        ))}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center py-16 text-center">
      <AeviaArc size={40} />
      <div className="mt-5 text-fg text-[16px]">Nothing to do yet.</div>
      <p className="mt-1 meta">Add your first task and Aevia will find time for it.</p>
    </div>
  );
}
