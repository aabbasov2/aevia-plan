"use client";

import { addDays, format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { weekStart } from "@/lib/time";

export function CalendarHeader({
  weekOffset,
  onChange,
}: {
  weekOffset: number;
  onChange: (v: number) => void;
}) {
  const ws = addDays(weekStart(), weekOffset * 7);
  const end = addDays(ws, 4);
  const label =
    ws.getMonth() === end.getMonth()
      ? `${format(ws, "MMMM d")} – ${format(end, "d, yyyy")}`
      : `${format(ws, "MMM d")} – ${format(end, "MMM d, yyyy")}`;

  return (
    <div className="mb-6 flex items-end justify-between">
      <div>
        <div className="wordmark text-[11px] text-fg-muted">CALENDAR</div>
        <h1 className="display mt-2 text-fg">{label}</h1>
      </div>
      <div className="flex items-center gap-1">
        <button className="btn h-9 w-9 p-0" onClick={() => onChange(weekOffset - 1)} aria-label="Previous week">
          <ChevronLeft size={14} />
        </button>
        <button className="btn h-9 px-3" onClick={() => onChange(0)}>
          Today
        </button>
        <button className="btn h-9 w-9 p-0" onClick={() => onChange(weekOffset + 1)} aria-label="Next week">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
