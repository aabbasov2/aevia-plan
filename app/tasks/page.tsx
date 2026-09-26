"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { TaskList } from "@/components/tasks/TaskList";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { PlanHealthCard } from "@/components/aevia/PlanHealthCard";
import { useStore } from "@/lib/store";

export default function TasksPage() {
  const [open, setOpen] = useState(false);
  const planWeek = useStore((s) => s.planWeek);
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-14">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px] lg:gap-10">
        <div className="min-w-0 fade-in">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="wordmark text-[11px] text-fg-muted">TASKS</div>
              <h1 className="display mt-2 text-fg">Everything on your mind.</h1>
              <p className="mt-2 text-fg-muted text-[15px]">
                Drag any task onto the calendar to schedule it.
              </p>
            </div>
            <button className="btn btn-gold" onClick={() => setOpen(true)}>
              <Plus size={14} /> New task
            </button>
          </div>

          <div className="mt-10">
            <TaskList />
          </div>
        </div>

        <aside className="min-w-0">
          <PlanHealthCard />
        </aside>
      </div>

      <CreateTaskModal
        open={open}
        onOpenChange={setOpen}
        onCreated={() => planWeek()}
      />
    </div>
  );
}
