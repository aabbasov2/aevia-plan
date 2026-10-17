"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, CalendarClock, Play, RotateCcw, Trash2, X } from "lucide-react";
import { AeviaArc } from "@/components/brand/AeviaArc";
import { projectList } from "@/lib/projects";
import { useStore } from "@/lib/store";
import type { CalendarEvent, ProjectKey } from "@/lib/types";
import { weekStart } from "@/lib/time";

const EVENT_TYPES: Array<{ label: string; value: CalendarEvent["kind"] }> = [
  { label: "Meeting", value: "meeting" },
  { label: "Task", value: "task" },
  { label: "Focus", value: "focus" },
];

export function EventEditorModal({
  eventId,
  onClose,
  onFocusTask,
}: {
  eventId: string | null;
  onClose: () => void;
  onFocusTask?: (taskId: string) => void;
}) {
  const event = useStore((state) => state.events.find((item) => item.id === eventId));
  const task = useStore((state) => state.tasks.find((item) => item.id === event?.taskId));
  const updateEvent = useStore((state) => state.updateEvent);
  const setEventKind = useStore((state) => state.setEventKind);
  const updateTask = useStore((state) => state.updateTask);
  const updateTaskDeadline = useStore((state) => state.updateTaskDeadline);
  const unschedule = useStore((state) => state.unschedule);
  const setEventsCancelled = useStore((state) => state.setEventsCancelled);
  const planWeek = useStore((state) => state.planWeek);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [kind, setKind] = useState<CalendarEvent["kind"]>("meeting");
  const [project, setProject] = useState<ProjectKey>("work");
  const [deadline, setDeadline] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!event) return;
    const startDate = new Date(event.start);
    const endDate = new Date(startDate.getTime() + event.durationMinutes * 60_000);
    setTitle(event.title);
    setStart(toLocalInputValue(startDate));
    setEnd(toLocalInputValue(endDate));
    setKind(event.kind === "personal" ? "focus" : event.kind);
    setProject(event.project ?? "work");
    setDeadline(task?.deadline ? toLocalInputValue(new Date(task.deadline)) : "");
    setMessage(null);
  }, [event, task]);

  useEffect(() => {
    if (!eventId) return;
    const onKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [eventId, onClose]);

  const origin = useMemo(
    () => event?.origin ?? (event?.kind === "task" ? "aevia" : "user"),
    [event]
  );

  if (!eventId || !event) return null;

  function save() {
    if (!event) return;
    if (!title.trim() || !start || !end) return;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60_000);
    if (durationMinutes <= 0) {
      setMessage("End time must be later than start time.");
      return;
    }
    const result = updateEvent(event.id, {
      title: title.trim(),
      start: startDate.toISOString(),
      durationMinutes,
      kind: event.kind === "lunch" ? event.kind : kind,
      project,
      colorIndex: colorForProject(project),
    });
    if (!result.updated) {
      setMessage(result.message ?? "That time is unavailable.");
      return;
    }
    if (event.kind !== "lunch") setEventKind(event.id, kind);
    if (event.taskId && kind === "task") {
      updateTask(event.taskId, {
        title: title.trim(),
        project,
        colorIndex: colorForProject(project),
      });
      updateTaskDeadline(
        event.taskId,
        deadline ? new Date(deadline).toISOString() : undefined
      );
    }
    if (result.movedTask) planWeek(weekStart(startDate).getTime());
    onClose();
  }

  function changeStart(value: string) {
    const previousStart = new Date(start);
    const previousEnd = new Date(end);
    const nextStart = new Date(value);
    if (
      value &&
      !Number.isNaN(previousStart.getTime()) &&
      !Number.isNaN(previousEnd.getTime()) &&
      !Number.isNaN(nextStart.getTime())
    ) {
      const durationMs = previousEnd.getTime() - previousStart.getTime();
      setEnd(toLocalInputValue(new Date(nextStart.getTime() + durationMs)));
    }
    setStart(value);
  }

  function remove() {
    if (!event) return;
    unschedule(event.id);
    onClose();
  }

  function toggleCancellation() {
    if (!event) return;
    setEventsCancelled([event.id], !event.cancelled);
  }

  const fixedKind = event.kind === "lunch";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4 fade-in sm:p-6"
      onClick={onClose}
    >
      <div
        className="card-raised max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto p-5 fade-in sm:p-6"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] text-fg-muted">
              {origin === "aevia" ? <AeviaArc size={13} /> : <span className="h-1.5 w-1.5 rounded-full bg-[var(--fg)] opacity-75" />}
              {origin === "aevia" ? "Placed by Aevia" : "Placed by you"}
            </div>
            <h2 className="h2 text-fg">Edit calendar event</h2>
          </div>
          <button className="btn btn-ghost h-8 w-8 p-0" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Event">
            <input className="input" value={title} onChange={(inputEvent) => setTitle(inputEvent.target.value)} autoFocus />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Starts">
              <input type="datetime-local" className="input" value={start} onChange={(inputEvent) => changeStart(inputEvent.target.value)} />
            </Field>
            <Field label="Ends">
              <input type="datetime-local" className="input" value={end} onChange={(inputEvent) => setEnd(inputEvent.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Type">
              {fixedKind ? (
                <div className="input flex items-center gap-2 text-fg-muted">
                  <CalendarClock size={14} /> Lunch
                </div>
              ) : (
                <select className="input" value={kind} onChange={(inputEvent) => setKind(inputEvent.target.value as CalendarEvent["kind"])}>
                  {EVENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              )}
            </Field>
            <Field label="Project">
              <select className="input" value={project} onChange={(inputEvent) => setProject(inputEvent.target.value as ProjectKey)}>
                {projectList.map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
              </select>
            </Field>
          </div>

          {event.taskId && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <Field label="Task deadline">
                <input
                  type="datetime-local"
                  className="input"
                  value={deadline}
                  onChange={(inputEvent) => setDeadline(inputEvent.target.value)}
                />
              </Field>
              <p className="mt-2 meta">
                This belongs to the task, not just this calendar block. Aevia uses it when replanning any remaining work.
              </p>
            </div>
          )}
        </div>

        {message && <p className="mt-4 text-[12px] text-[#d39a76]">{message}</p>}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button className="btn h-9 px-3" onClick={toggleCancellation}>
              {event.cancelled ? <RotateCcw size={13} /> : <Ban size={13} />}
              {event.cancelled ? "Restore event" : "Cancel event"}
            </button>
            <button className="btn btn-ghost h-9 px-2 text-fg-muted hover:text-[#d39a76]" onClick={remove}>
              <Trash2 size={13} /> Delete
            </button>
          </div>
          <div className="ml-auto flex gap-2">
            {event.taskId && task && !task.completed && <button className="btn h-9" onClick={() => { onFocusTask?.(task.id); onClose(); }}><Play size={13} /> Focus task</button>}
            <button className="btn" onClick={onClose}>Close</button>
            <button className="btn btn-gold" onClick={save}>Save changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function toLocalInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function colorForProject(project: ProjectKey) {
  return { personal: 1, university: 2, travel: 3, work: 4, aevia: 5 }[project];
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="mb-1.5 wordmark text-[10px] text-fg-muted">{label}</div>{children}</label>;
}
