"use client";

import { useState } from "react";
import { addDays, addMonths, format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  SlidersHorizontal,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { CalendarView } from "@/lib/calendar-layout";
import { planningWeekStart } from "@/lib/planner";
import { useStore } from "@/lib/store";
import { weekStart } from "@/lib/time";

const VIEW_LEVELS: CalendarView[] = ["month", "week", "day"];

export function CalendarHeader({
  anchorDate,
  view,
  onAnchorChange,
  onViewChange,
  onAddEvent,
  onPreferences,
}: {
  anchorDate: Date;
  view: CalendarView;
  onAnchorChange: (date: Date) => void;
  onViewChange: (view: CalendarView) => void;
  onAddEvent: () => void;
  onPreferences: () => void;
}) {
  const planWeek = useStore((state) => state.planWeek);
  const clearPlan = useStore((state) => state.clearPlan);
  const [planned, setPlanned] = useState(false);
  const [cleared, setCleared] = useState(false);
  const ws = weekStart(anchorDate);
  const end = addDays(ws, 6);
  const weekLabel =
    ws.getMonth() === end.getMonth()
      ? `${format(ws, "MMMM d")} – ${format(end, "d, yyyy")}`
      : `${format(ws, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  const label =
    view === "day"
      ? format(anchorDate, "EEEE, MMMM d, yyyy")
      : view === "month"
        ? format(anchorDate, "MMMM yyyy")
        : weekLabel;
  const viewIndex = VIEW_LEVELS.indexOf(view);

  function movePeriod(direction: -1 | 1) {
    if (view === "day") {
      onAnchorChange(addDays(anchorDate, direction));
      return;
    }
    if (view === "month") {
      onAnchorChange(addMonths(anchorDate, direction));
      return;
    }
    onAnchorChange(addDays(anchorDate, direction * 7));
  }

  function zoom(direction: -1 | 1) {
    const nextIndex = Math.max(
      0,
      Math.min(VIEW_LEVELS.length - 1, viewIndex + direction)
    );
    onViewChange(VIEW_LEVELS[nextIndex]);
  }

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
      <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <button className="btn h-9 w-9 p-0" onClick={() => movePeriod(-1)} aria-label={`Previous ${view}`}>
              <ChevronLeft size={14} />
            </button>
            <button className="btn h-9 px-4" onClick={() => onAnchorChange(new Date())}>Today</button>
            <button className="btn h-9 w-9 p-0" onClick={() => movePeriod(1)} aria-label={`Next ${view}`}>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5" aria-label="Calendar view">
            {VIEW_LEVELS.slice().reverse().map((calendarView) => (
              <button
                key={calendarView}
                className={`h-8 rounded-md px-3 text-[11px] capitalize transition-colors ${
                  view === calendarView
                    ? "bg-[var(--surface)] text-fg shadow-sm"
                    : "text-fg-muted hover:text-fg"
                }`}
                onClick={() => onViewChange(calendarView)}
                aria-pressed={view === calendarView}
              >
                {calendarView}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1" aria-label="Calendar zoom">
            <button
              className="btn h-9 w-9 p-0"
              onClick={() => zoom(-1)}
              disabled={viewIndex === 0}
              aria-label="Zoom out"
              title="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              className="btn h-9 w-9 p-0"
              onClick={() => zoom(1)}
              disabled={viewIndex === VIEW_LEVELS.length - 1}
              aria-label="Zoom in"
              title="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button className="btn btn-gold h-9 px-3 sm:hidden" onClick={onAddEvent}>+ New event</button>
          <button className="btn h-9 px-3" onClick={onPreferences}>
            <SlidersHorizontal size={13} /> Preferences
          </button>
          <button
            className="btn h-9 px-3"
            onClick={() => {
              const activePlanningWeek = planningWeekStart(new Date());
              const targetWeek = ws < activePlanningWeek ? activePlanningWeek : ws;
              planWeek(targetWeek.getTime());
              if (targetWeek.getTime() !== ws.getTime()) onAnchorChange(targetWeek);
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
      <p className="-mt-2 text-[11px] text-fg-subtle">
        Pinch or Ctrl/⌘ + scroll to move between day, week, and month.
      </p>
    </div>
  );
}
