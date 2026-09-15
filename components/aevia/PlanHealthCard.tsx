"use client";

import { useStore } from "@/lib/store";
import { derivePlanHealth } from "@/lib/plan-health";
import { Check, AlertTriangle, Clock } from "lucide-react";

export function PlanHealthCard() {
  const tasks = useStore((s) => s.tasks);
  const events = useStore((s) => s.events);
  const health = derivePlanHealth(tasks, events);

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="meta">Plan Health</span>
        {health.state === "on-track" && (
          <span className="flex items-center gap-1 text-[11px] text-gold">
            <Check size={12} /> On track
          </span>
        )}
        {health.state === "needs-attention" && (
          <span className="flex items-center gap-1 text-[11px]" style={{ color: "#D6A24B" }}>
            <Clock size={12} /> Needs attention
          </span>
        )}
        {health.state === "wont-fit" && (
          <span className="flex items-center gap-1 text-[11px]" style={{ color: "#B87259" }}>
            <AlertTriangle size={12} /> Won&apos;t fit
          </span>
        )}
      </div>

      {health.state === "on-track" && (
        <>
          <p className="text-fg text-[15px] leading-6">Everything fits this week.</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <StatLine label="Remaining" value={`${health.remainingHours}h`} />
            <StatLine label="Available" value={`${health.availableHours}h`} />
          </div>
        </>
      )}

      {health.state === "needs-attention" && (
        <>
          <p className="text-fg text-[15px] leading-6">
            Some work still needs scheduling.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <StatLine label="Remaining" value={`${health.remainingHours}h`} />
            <StatLine label="Scheduled" value={`${health.scheduledHours}h`} />
          </div>
        </>
      )}

      {health.state === "wont-fit" && (
        <>
          <p className="text-fg text-[15px] leading-6">
            You need {health.shortfallHours}h before {health.deadlineLabel}.
          </p>
          <div className="mt-4">
            <button className="btn btn-ghost text-fg">Review deadlines →</button>
          </div>
        </>
      )}
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-fg-subtle text-[11px] uppercase tracking-wider">{label}</div>
      <div className="mt-1 text-fg text-[20px] leading-6" style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}
