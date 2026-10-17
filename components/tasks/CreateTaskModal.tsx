"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useStore } from "@/lib/store";
import { projectList } from "@/lib/projects";
import type { ProjectKey, Recurrence, Task } from "@/lib/types";
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
  onCreated,
  task,
  initialRequest,
  deferScheduling = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (taskId: string) => void;
  task?: Task;
  initialRequest?: string;
  deferScheduling?: boolean;
}) {
  const createTask = useStore((s) => s.createTask);
  const updateTask = useStore((s) => s.updateTask);
  const scheduleTaskAt = useStore((s) => s.scheduleTaskAt);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(60);
  const [deadline, setDeadline] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [project, setProject] = useState<ProjectKey>("work");
  const [recurrence, setRecurrence] = useState<Recurrence["kind"]>("none");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [request, setRequest] = useState("");
  const [interpreting, setInterpreting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiClarification, setAiClarification] = useState<string | null>(null);
  const [focusBlockMinutes, setFocusBlockMinutes] = useState(120);
  const [splitIntoSessions, setSplitIntoSessions] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title);
      setDuration(task.durationMinutes);
      setDeadline(task.deadline ? toLocalDateTime(task.deadline) : "");
      setScheduleAt("");
      setProject(task.project);
      setRecurrence(task.recurrence.kind);
      setNotes(task.notes ?? "");
      setMode("manual");
      setRequest("");
      setAiError(null);
      setAiClarification(null);
      setFocusBlockMinutes(task.focusBlockMinutes ?? 120);
      setSplitIntoSessions(Boolean(task.splitPreference));
    } else if (initialRequest) {
      setMode("ai");
      setRequest(initialRequest);
    } else {
      reset();
    }
  // Seed the form when opened or when the selected task changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRequest, open, task?.id]);

  if (!open) return null;

  function submit() {
    if (!title.trim()) return;
    if (task) {
      updateTask(task.id, {
        title: title.trim(),
        durationMinutes: duration,
        focusBlockMinutes,
        splitPreference: splitIntoSessions,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        recurrence: { kind: recurrence } as Recurrence,
        project,
        notes: notes.trim() || undefined,
        colorIndex: colorForProject(project),
      });
      reset();
      onOpenChange(false);
      return;
    }
    const taskId = createTask({
      title: title.trim(),
      durationMinutes: duration,
      focusBlockMinutes,
      splitPreference: splitIntoSessions,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
      recurrence: { kind: recurrence } as Recurrence,
      project,
      notes: notes.trim() || undefined,
      colorIndex: colorForProject(project),
    }, {
      autoSchedule: !scheduleAt && !deferScheduling,
    });
    if (scheduleAt) scheduleTaskAt(taskId, new Date(scheduleAt).toISOString());
    reset();
    onOpenChange(false);
    onCreated?.(taskId);
  }

  function reset() {
    setTitle("");
    setDuration(60);
    setDeadline("");
    setScheduleAt("");
    setRecurrence("none");
    setNotes("");
    setProject("work");
    setMode("ai");
    setRequest("");
    setAiError(null);
    setAiClarification(null);
    setFocusBlockMinutes(120);
    setSplitIntoSessions(false);
  }

  async function interpretRequest() {
    if (!request.trim() || interpreting) return;
    setInterpreting(true);
    setAiError(null);
    setAiClarification(null);
    try {
      const now = new Date();
      const response = await fetch("/api/ai/interpret-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: request,
          today: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Aevia couldn't interpret that request.");
      setTitle(data.title);
      setDuration(data.durationMinutes);
      setDeadline(data.deadlineDate ? `${data.deadlineDate}T23:59` : "");
      setProject(data.project);
      setFocusBlockMinutes(data.sessionMinutes);
      setSplitIntoSessions(Boolean(data.splitIntoSessions));
      setAiClarification(data.needsClarification ? data.clarification : null);
      if (!data.needsClarification) setMode("manual");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Aevia couldn't interpret that request.");
    } finally {
      setInterpreting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4 fade-in sm:p-6"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="card-raised max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto p-5 fade-in sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="h2 text-fg">{task ? "Edit task" : mode === "ai" ? "Tell Aevia what needs doing" : "Review your task"}</h2>
          <button className="btn-ghost btn h-8 w-8 p-0" onClick={() => onOpenChange(false)}>
            <X size={14} />
          </button>
        </div>

        <div className="mb-5 flex gap-2">
          <button className={`chip cursor-pointer ${mode === "ai" ? "border-[var(--gold)] bg-[var(--gold-soft)] text-fg" : "hover:text-fg"}`} onClick={() => setMode("ai")}>Describe it</button>
          <button className={`chip cursor-pointer ${mode === "manual" ? "border-[var(--gold)] bg-[var(--gold-soft)] text-fg" : "hover:text-fg"}`} onClick={() => setMode("manual")}>Enter details</button>
        </div>

        {mode === "ai" ? (
          <div className="space-y-4">
            <Field label="What do you need to finish?">
              <textarea
                className="input"
                rows={4}
                maxLength={2000}
                placeholder="I need to finish document filing by Oct 19. It usually takes around 8 hours."
                value={request}
                onChange={(event) => setRequest(event.target.value)}
                autoFocus
              />
            </Field>
            <p className="text-[12px] leading-5 text-fg-muted">Aevia keeps work in a solid block whenever it can. Longer tasks can use a few substantial sessions, then you can review the schedule before applying it.</p>
            {aiError && <p role="alert" className="text-[12px] text-[#d39a76]">{aiError}</p>}
            {aiClarification && <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-[12px] text-fg-muted">{aiClarification}</p>}
          </div>
        ) : (
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Deadline">
            <input
              type="datetime-local"
                className="input"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            <span className="mt-1 block text-[10px] text-fg-subtle">
              Aevia will find open calendar time before this deadline.
            </span>
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

          {!task && <Field label="Schedule at (optional)">
            <input
              type="datetime-local"
              className="input"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
            />
          </Field>}

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
          {mode === "manual" && request && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-[12px] text-fg-muted">
              <div className="wordmark mb-1 text-[10px]">Aevia understood</div>
              {title} · {Math.floor(duration / 60)}h{duration % 60 ? ` ${duration % 60}m` : ""}{deadline ? ` · by ${new Date(deadline).toLocaleDateString()}` : ""}{splitIntoSessions ? ` · split into sessions up to ${focusBlockMinutes}m` : " · one solid block when available"}
            </div>
          )}
        </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button className="btn" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          {mode === "ai" ? (
            <button className="btn btn-gold" onClick={interpretRequest} disabled={!request.trim() || interpreting}>
              {interpreting ? "Understanding…" : aiClarification ? "Try again" : "Understand task"}
            </button>
          ) : (
            <button className="btn btn-gold" onClick={submit}>
              {task ? "Save changes" : "Schedule task"}
            </button>
          )}
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

function toLocalDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 wordmark text-[10px] text-fg-muted">{label}</div>
      {children}
    </label>
  );
}
