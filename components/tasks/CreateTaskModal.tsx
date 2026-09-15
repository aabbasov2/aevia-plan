"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useStore } from "@/lib/store";
import { projectList } from "@/lib/projects";
import type { ProjectKey, Recurrence } from "@/lib/types";
import { cn } from "@/lib/cn";

const DURATIONS = [
  { label: "30m", min: 30 },
  { label: "1h", min: 60 },
  { label: "1h30", min: 90 },
  { label: "2h", min: 120 },
  { label: "3h", min: 180 },
];

const RECURRENCES: { label: string; value: Recurrence["kind"] }[] = [
  { label: "None", value: "none" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "First week / month", value: "monthly-first-week" },
];

export function CreateTaskModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const createTask = useStore((s) => s.createTask);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(60);
  const [deadline, setDeadline] = useState("");
  const [project, setProject] = useState<ProjectKey>("work");
  const [recurrence, setRecurrence] = useState<Recurrence["kind"]>("none");
  const [notes, setNotes] = useState("");

  if (!open) return null;

  function submit() {
    if (!title.trim()) return;
    createTask({
      title: title.trim(),
      durationMinutes: duration,
      deadline: deadline ? new Date(`${deadline}T18:00:00`).toISOString() : undefined,
      recurrence: { kind: recurrence } as Recurrence,
      project,
      notes: notes.trim() || undefined,
      colorIndex: colorForProject(project),
    });
    reset();
    onOpenChange(false);
  }

  function reset() {
    setTitle("");
    setDuration(60);
    setDeadline("");
    setRecurrence("none");
    setNotes("");
    setProject("work");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 fade-in"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="card-raised w-full max-w-lg p-6 fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="h2 text-fg">New task</h2>
          <button className="btn-ghost btn h-8 w-8 p-0" onClick={() => onOpenChange(false)}>
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Task">
            <input
              className="input"
              placeholder="What needs to happen?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </Field>

          <Field label="Duration">
            <div className="flex flex-wrap gap-1.5">
              {DURATIONS.map((d) => (
                <button
                  key={d.min}
                  onClick={() => setDuration(d.min)}
                  className={cn(
                    "chip cursor-pointer transition-colors",
                    duration === d.min
                      ? "bg-[var(--gold-soft)] text-fg border-[var(--gold)]"
                      : "hover:text-fg"
                  )}
                >
                  {d.label}
                </button>
              ))}
              <input
                type="number"
                min={5}
                max={480}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) || 0)}
                className="input h-7 w-24 text-[12px]"
                aria-label="Custom minutes"
              />
              <span className="meta self-center">min</span>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Deadline">
              <input
                type="date"
                className="input"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </Field>
            <Field label="Project">
              <select
                className="input"
                value={project}
                onChange={(e) => setProject(e.target.value as ProjectKey)}
              >
                {projectList.map(([key, p]) => (
                  <option key={key} value={key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Repeat">
            <div className="flex flex-wrap gap-1.5">
              {RECURRENCES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRecurrence(r.value)}
                  className={cn(
                    "chip cursor-pointer transition-colors",
                    recurrence === r.value
                      ? "bg-[var(--gold-soft)] text-fg border-[var(--gold)]"
                      : "hover:text-fg"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Notes">
            <textarea
              className="input"
              rows={3}
              placeholder="Optional context"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button className="btn" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button className="btn btn-gold" onClick={submit}>
            Create task
          </button>
        </div>
      </div>
    </div>
  );
}

function colorForProject(p: ProjectKey): number {
  const map: Record<ProjectKey, number> = {
    personal: 1,
    university: 2,
    travel: 3,
    work: 4,
    aevia: 5,
  };
  return map[p];
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 wordmark text-[10px] text-fg-muted">{label}</div>
      {children}
    </label>
  );
}
