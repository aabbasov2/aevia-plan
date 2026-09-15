"use client";

import { useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { useStore } from "@/lib/store";
import { buildSuggestions } from "@/lib/suggestions";
import { weekStart, formatHm, humanDuration } from "@/lib/time";
import { X } from "lucide-react";

export function PlanSuggestionsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const tasks = useStore((s) => s.tasks);
  const applySuggestion = useStore((s) => s.applySuggestion);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const suggestions = useMemo(() => buildSuggestions(tasks), [tasks]);
  const ws = weekStart();

  if (!open) return null;

  function apply(id: string) {
    const s = suggestions.find((x) => x.id === id);
    if (!s) return;
    applySuggestion(s.taskId, s.day, s.startMinutes, s.durationMinutes);
    setApplied((prev) => new Set(prev).add(id));
  }

  function applyAll() {
    suggestions.forEach((s) => {
      if (!applied.has(s.id)) applySuggestion(s.taskId, s.day, s.startMinutes, s.durationMinutes);
    });
    setApplied(new Set(suggestions.map((s) => s.id)));
    setTimeout(() => onOpenChange(false), 600);
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
          <div>
            <div className="wordmark text-[11px] text-fg-muted">AEVIA · SUGGESTIONS</div>
            <h2 className="mt-1 h2 text-fg">A plan for your week</h2>
          </div>
          <button className="btn-ghost btn h-8 w-8 p-0" onClick={() => onOpenChange(false)}>
            <X size={14} />
          </button>
        </div>

        <ul className="space-y-2">
          {suggestions.map((s) => {
            const day = addDays(ws, s.day);
            const isApplied = applied.has(s.id);
            return (
              <li
                key={s.id}
                className="flex items-start gap-4 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <div className="flex-1">
                  <div className="text-fg text-[14px]">{s.taskTitle}</div>
                  <div className="mt-1 meta">
                    {format(day, "EEE d MMM")} · {formatHm(s.startMinutes)} · {humanDuration(s.durationMinutes)}
                  </div>
                  <div className="mt-2 text-fg-subtle text-[12px]">{s.reason}</div>
                </div>
                <button
                  className={`btn ${isApplied ? "btn-ghost" : ""}`}
                  onClick={() => !isApplied && apply(s.id)}
                  disabled={isApplied}
                >
                  {isApplied ? "Applied" : "Apply"}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex items-center justify-between">
          <div className="meta">All suggestions can be adjusted on the calendar.</div>
          <button className="btn btn-gold" onClick={applyAll}>
            Apply all
          </button>
        </div>
      </div>
    </div>
  );
}
