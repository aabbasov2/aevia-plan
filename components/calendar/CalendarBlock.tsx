"use client";

import { useDraggable } from "@dnd-kit/core";
import { blockColor } from "@/lib/projects";
import { formatRange } from "@/lib/time";
import type { CalendarEvent } from "@/lib/types";
import { cn } from "@/lib/cn";

const HOUR_HEIGHT = 48;
const START_HOUR = 8;

export function CalendarBlock({
  event,
  startMinutesInDay,
}: {
  event: CalendarEvent;
  startMinutesInDay: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `event-${event.id}`,
  });

  const top = ((startMinutesInDay - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const height = (event.durationMinutes / 60) * HOUR_HEIGHT;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "absolute left-1.5 right-1.5 z-10 cursor-grab overflow-hidden rounded-lg border border-white/[0.05] border-l-2 px-2.5 py-1.5 shadow-[0_4px_14px_rgba(0,0,0,0.18)] transition-all active:cursor-grabbing hover:-translate-y-px hover:border-white/[0.1] hover:shadow-elev",
        isDragging ? "opacity-40" : ""
      )}
      style={{
        top,
        height: Math.max(24, height - 2),
        background: blockColor(event.colorIndex),
        borderLeftColor: event.kind === "task" ? "var(--gold)" : "var(--border-strong)",
      }}
    >
      <div className="truncate text-[12px] font-medium leading-4 text-fg">{event.title}</div>
      {height >= 34 && (
        <div className="mt-0.5 truncate text-[10.5px] leading-4 text-fg-muted" style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatRange(startMinutesInDay, event.durationMinutes)}
        </div>
      )}
    </div>
  );
}
