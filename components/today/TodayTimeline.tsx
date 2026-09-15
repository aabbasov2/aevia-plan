"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { formatRange, formatHm } from "@/lib/time";
import { blockColor, PROJECTS } from "@/lib/projects";
import type { CalendarEvent } from "@/lib/types";

function minutesInDay(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export function TodayTimeline() {
  const events = useStore((s) => s.events);

  const todays = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => {
        const d = new Date(e.start);
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        );
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [events]);

  if (todays.length === 0) {
    return <TimelineFallback />;
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-[var(--border)] px-6 py-4">
        <div className="meta">Timeline · Today</div>
      </div>
      <div>
        {todays.map((e) => (
          <TimelineRow key={e.id} event={e} />
        ))}
      </div>
    </div>
  );
}

function TimelineRow({ event }: { event: CalendarEvent }) {
  const start = minutesInDay(event.start);
  const project = event.project ? PROJECTS[event.project] : undefined;
  return (
    <div className="grid grid-cols-[76px_1fr] items-stretch border-b border-[var(--border)] last:border-b-0">
      <div className="flex flex-col justify-center px-6 py-4 text-fg-subtle text-[12px] leading-4" style={{ fontVariantNumeric: "tabular-nums" }}>
        <div className="text-fg-muted">{formatHm(start)}</div>
        <div>{formatHm(start + event.durationMinutes)}</div>
      </div>
      <div className="py-3 pr-6">
        <div
          className="flex items-center gap-3 rounded-md border-l-2 px-4 py-3 transition-colors hover:brightness-110"
          style={{
            background: blockColor(event.colorIndex),
            borderLeftColor: event.kind === "task" ? "var(--gold)" : "var(--border-strong)",
          }}
        >
          <div className="flex-1">
            <div className="text-fg text-[14px]">{event.title}</div>
            <div className="mt-0.5 text-fg-muted text-[11px]">
              {formatRange(start, event.durationMinutes)}
              {project ? ` · ${project.label}` : ""}
            </div>
          </div>
          {event.kind === "meeting" && (
            <button className="btn h-7 rounded-full px-3 text-[11px]">Join</button>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineFallback() {
  return (
    <div className="card p-8 text-center">
      <div className="meta">Nothing scheduled for today.</div>
      <p className="mt-2 text-fg text-[15px]">Everything gets done. It&apos;s a matter of when.</p>
    </div>
  );
}
