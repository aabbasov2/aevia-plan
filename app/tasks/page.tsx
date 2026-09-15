"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { TaskList } from "@/components/tasks/TaskList";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { PlanHealthCard } from "@/components/aevia/PlanHealthCard";

export default function TasksPage() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-auto max-w-[1240px] px-10 py-14">
      <div className="grid grid-cols-[1fr_320px] gap-10">
        <div className="fade-in">
          <div className="flex items-end justify-between">
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

        <aside>
          <PlanHealthCard />
        </aside>
      </div>

      <CreateTaskModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
