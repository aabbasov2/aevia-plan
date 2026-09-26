"use client";

import { addDays, format } from "date-fns";
import { ChevronLeft, ChevronRight, RotateCw, Trash2 } from "lucide-react";
import { weekStart } from "@/lib/time";
import { useStore } from "@/lib/store";
import { useState } from "react";

export function CalendarHeader({
  weekOffset,
  onChange,
  onAddEvent,
}: {
  weekOffset: number;
  onChange: (v: number) => void;
  onAddEvent: () => void;
}) {
  const planWeek = useStore((s) => s.planWeek);
  const clearPlan = useStore((s) => s.clearPlan);
  const [planned, setPlanned] = useState(false);
  const [cleared, setCleared] = useState(false);
  const ws = addDays(weekStart(), weekOffset * 7);
  const end = addDays(ws, 4);
  const label =
    ws.getMonth() === end.getMonth()
      ? `${format(ws, "MMMM d")} – ${format(end, "d, yyyy")}`
      : `${format(ws, "MMM d")} – ${format(end, "MMM d, yyyy")}`;

  return (
    <div className="mb-6 space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="wordmark text-[11px] text-fg-muted">CALENDAR</div>
          <h1 className="display mt-2 text-fg">{label}</h1>
        </div>
        <button className="btn btn-gold hidden h-10 shrink-0 px-4 sm:inline-flex" onClick={onAddEvent}>
          + New event
        </button>
      </div>
      <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          <button className="btn h-9 w-9 p-0" onClick={() => onChange(weekOffset - 1)} aria-label="Previous week">
            <ChevronLeft size={14} />
          </button>
          <button className="btn h-9 px-4" onClick={() => onChange(0)}>Today</button>
          <button className="btn h-9 w-9 p-0" onClick={() => onChange(weekOffset + 1)} aria-label="Next week">
            <ChevronRight size={14} />
          </button>
          <span className="ml-2 hidden text-[12px] text-fg-subtle sm:inline">Mon–Fri · 08:00–20:00</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button className="btn btn-gold h-9 px-3 sm:hidden" onClick={onAddEvent}>+ New event</button>
          <button
            className="btn h-9 px-3"
            onClick={() => {
              planWeek();
              setPlanned(true);
              window.setTimeout(() => setPlanned(false), 1800);
            }}
          >
            <RotateCw size={13} /> {planned ? "Replanned" : "Replan week"}
          </button>
          <button
            className="btn btn-ghost h-9 px-3 text-fg-subtle"
            onClick={() => {
              if (!window.confirm("Clear all tasks and calendar events for this test?")) return;
              clearPlan();
              setCleared(true);
              window.setTimeout(() => setCleared(false), 1800);
            }}
          >
            <Trash2 size={13} /> {cleared ? "Cleared" : "Clear"}
          </button>
        </div>
      </div>
    </div>
  );
}
