"use client";

import { useState } from "react";
import { AeviaArc } from "@/components/brand/AeviaArc";
import { useStore } from "@/lib/store";
import { deriveMetrics } from "@/lib/plan-health";
import { PlanSuggestionsModal } from "./PlanSuggestionsModal";

export function AeviaPanel({ variant = "rail" }: { variant?: "rail" | "hero" }) {
  const tasks = useStore((s) => s.tasks);
  const events = useStore((s) => s.events);
  const m = deriveMetrics(tasks, events);
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);

  function onPlan() {
    setPulse(true);
    setOpen(true);
    setTimeout(() => setPulse(false), 1500);
  }

  const summary =
    m.health.state === "on-track"
      ? "Your week is on track."
      : m.health.state === "needs-attention"
      ? "Your week is mostly on track."
      : "Your week is tight before Friday.";

  return (
    <>
      <div className={`card ${variant === "hero" ? "p-8" : "p-5"}`}>
        <div className="mb-4 flex items-center gap-3">
          <AeviaArc size={variant === "hero" ? 36 : 22} pulse={pulse} />
          <span className="wordmark text-[12px] text-fg-muted">AEVIA</span>
        </div>
        <p className={variant === "hero" ? "text-fg text-[22px] leading-8" : "text-fg text-[15px] leading-6"}>
          {summary}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat label="Remaining" value={`${m.remainingHours}h`} />
          <Stat label="Available" value={`${m.availableHours}h`} />
          <Stat label="Scheduled" value={`${m.scheduledHours}h`} />
        </div>
        <button onClick={onPlan} className="btn btn-gold mt-6">
          Plan my time
        </button>
      </div>
      <PlanSuggestionsModal open={open} onOpenChange={setOpen} />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-fg-subtle text-[10px] uppercase tracking-wider">{label}</div>
      <div className="mt-0.5 text-fg text-[18px]" style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}
