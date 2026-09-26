"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useStore } from "@/lib/store";
import { projectList } from "@/lib/projects";
import type { CalendarEvent, ProjectKey } from "@/lib/types";

const DURATIONS = [
  { label: "30m", value: 30 },
  { label: "1h", value: 60 },
  { label: "1h30", value: 90 },
  { label: "2h", value: 120 },
];

const EVENT_TYPES: Array<{ label: string; value: CalendarEvent["kind"] }> = [
  { label: "Meeting", value: "meeting" },
  { label: "Focus", value: "focus" },
  { label: "Personal", value: "personal" },
];

export function CreateEventModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createEvent = useStore((s) => s.createEvent);
  const planWeek = useStore((s) => s.planWeek);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(toLocalInputValue(new Date()));
  const [end, setEnd] = useState("");
  const [duration, setDuration] = useState<number | "">(60);
  const [kind, setKind] = useState<CalendarEvent["kind"]>("meeting");
  const [project, setProject] = useState<ProjectKey>("work");
  const [message, setMessage] = useState<string | null>(null);

  if (!open) return null;

  function submit() {
    if (!title.trim() || !start || (!end && !duration)) return;
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date(startDate.getTime() + Number(duration) * 60_000);
    const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60_000);
    if (durationMinutes <= 0) return;
    const result = createEvent({
      title: title.trim(),
      start: startDate.toISOString(),
      durationMinutes,
      kind,
      project,
      colorIndex: colorForProject(project),
    });
    if (!result.created) {
      setMessage(result.message ?? "That time is unavailable.");
      return;
    }
    if (result.movedTask) planWeek();
    setTitle("");
    setMessage(null);
    onOpenChange(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 fade-in sm:p-6" onClick={() => onOpenChange(false)}>
      <div className="card-raised max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto p-5 fade-in sm:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="h2 text-fg">New calendar event</h2>
          <button className="btn-ghost btn h-8 w-8 p-0" onClick={() => onOpenChange(false)} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Event">
            <input className="input" placeholder="What is happening?" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
          </Field>

          <Field label="Starts">
            <input type="datetime-local" className="input" value={start} onChange={(event) => setStart(event.target.value)} />
          </Field>

          <Field label="Duration">
            <div className="flex flex-wrap gap-1.5">
              {DURATIONS.map((item) => (
                <button key={item.value} className={`chip cursor-pointer ${duration === item.value ? "border-[var(--gold)] bg-[var(--gold-soft)] text-fg" : "hover:text-fg"}`} onClick={() => setDuration(item.value)}>
                  {item.label}
                </button>
              ))}
              <input type="number" min={5} max={720} className="input h-7 w-24 text-[12px]" value={duration} onChange={(event) => setDuration(event.target.value ? Number(event.target.value) : "")} aria-label="Custom duration in minutes" placeholder="Optional" />
              <span className="meta self-center">min</span>
            </div>
          </Field>

          <Field label="Ends (optional)">
            <input type="datetime-local" className="input" value={end} onChange={(event) => setEnd(event.target.value)} />
            <div className="mt-1 meta">Set an end time or use the duration above.</div>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Type">
              <select className="input" value={kind} onChange={(event) => setKind(event.target.value as CalendarEvent["kind"])}>
                {EVENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </Field>
            <Field label="Project">
              <select className="input" value={project} onChange={(event) => setProject(event.target.value as ProjectKey)}>
                {projectList.map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button className="btn" onClick={() => onOpenChange(false)}>Cancel</button>
          <button className="btn btn-gold" onClick={submit}>Add event</button>
        </div>
        {message && <p className="mt-3 text-[12px] text-[#d39a76]">{message}</p>}
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
