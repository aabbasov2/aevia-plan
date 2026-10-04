"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatHm } from "@/lib/time";
import type { PlannerPreferences } from "@/lib/types";
import { planningWeekStart } from "@/lib/planner";

const TIME_OPTIONS = Array.from({ length: 35 }, (_, index) => 6 * 60 + index * 30);
const BUFFER_OPTIONS = [0, 5, 10, 15, 20, 30];
const LUNCH_DURATIONS = [30, 45, 60, 90];

export function CalendarPreferencesModal({
  open,
  onOpenChange,
  weekStartMs,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekStartMs: number;
}) {
  const preferences = useStore((state) => state.plannerPreferences);
  const updatePlannerPreferences = useStore((state) => state.updatePlannerPreferences);
  const ensureLunchEvents = useStore((state) => state.ensureLunchEvents);
  const planWeek = useStore((state) => state.planWeek);
  const [draft, setDraft] = useState<PlannerPreferences>(preferences);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(preferences);
      setMessage(null);
    }
  }, [open, preferences]);

  if (!open) return null;

  function save() {
    if (draft.workEndMinutes <= draft.workStartMinutes) {
      setMessage("Workday end must be later than its start.");
      return;
    }
    if (
      draft.lunchStartMinutes < draft.workStartMinutes ||
      draft.lunchStartMinutes + draft.lunchDurationMinutes > draft.workEndMinutes
    ) {
      setMessage("Lunch needs to fit inside your working hours.");
      return;
    }
    updatePlannerPreferences(draft);
    ensureLunchEvents(weekStartMs);
    if (weekStartMs === planningWeekStart(new Date()).getTime()) planWeek(weekStartMs);
    onOpenChange(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4 fade-in sm:p-6"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="card-raised max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto p-5 fade-in sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="wordmark text-[10px] text-fg-muted">PLANNING RULES</div>
            <h2 className="h2 mt-1 text-fg">Calendar preferences</h2>
          </div>
          <button className="btn btn-ghost h-8 w-8 p-0" onClick={() => onOpenChange(false)} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <div className="mb-2 wordmark text-[10px] text-fg-muted">WORKING HOURS</div>
            <div className="grid grid-cols-2 gap-3">
              <TimeField label="Start" value={draft.workStartMinutes} onChange={(value) => setDraft({ ...draft, workStartMinutes: value })} />
              <TimeField label="End" value={draft.workEndMinutes} onChange={(value) => setDraft({ ...draft, workEndMinutes: value })} />
            </div>
          </div>

          <div>
            <div className="mb-2 wordmark text-[10px] text-fg-muted">BUFFER BETWEEN EVENTS</div>
            <div className="flex flex-wrap gap-2">
              {BUFFER_OPTIONS.map((minutes) => (
                <button
                  key={minutes}
                  className={`chip cursor-pointer px-3 py-1.5 ${draft.bufferMinutes === minutes ? "border-[var(--gold)] bg-[var(--gold-soft)] text-fg" : "hover:text-fg"}`}
                  onClick={() => setDraft({ ...draft, bufferMinutes: minutes })}
                >
                  {minutes === 0 ? "None" : `${minutes} min`}
                </button>
              ))}
            </div>
            <p className="mt-2 meta">Aevia keeps this space around meetings, lunch, and focus blocks.</p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="mb-3 wordmark text-[10px] text-fg-muted">PREFERRED LUNCH</div>
            <div className="grid grid-cols-2 gap-3">
              <TimeField label="Starts" value={draft.lunchStartMinutes} onChange={(value) => setDraft({ ...draft, lunchStartMinutes: value })} />
              <label>
                <span className="mb-1.5 block text-[11px] text-fg-muted">Duration</span>
                <select
                  className="input"
                  value={draft.lunchDurationMinutes}
                  onChange={(event) => setDraft({ ...draft, lunchDurationMinutes: Number(event.target.value) })}
                >
                  {LUNCH_DURATIONS.map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}
                </select>
              </label>
            </div>
            <p className="mt-3 meta">Lunch appears as a calendar event Monday–Friday. Drag it whenever a day needs a different time.</p>
          </div>
        </div>

        {message && <p className="mt-4 text-[12px] text-[#d39a76]">{message}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn" onClick={() => onOpenChange(false)}>Cancel</button>
          <button className="btn btn-gold" onClick={save}>Save preferences</button>
        </div>
      </div>
    </div>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      <span className="mb-1.5 block text-[11px] text-fg-muted">{label}</span>
      <select className="input" value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {TIME_OPTIONS.map((minutes) => <option key={minutes} value={minutes}>{formatHm(minutes)}</option>)}
      </select>
    </label>
  );
}
