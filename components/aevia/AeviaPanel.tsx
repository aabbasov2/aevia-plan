"use client";

import { useState } from "react";
import { AeviaArc } from "@/components/brand/AeviaArc";
import { useStore } from "@/lib/store";
import { deriveMetrics } from "@/lib/plan-health";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { DayRecoveryModal } from "@/components/aevia/DayRecoveryModal";
import { formatHm } from "@/lib/time";
import { addMinutes, format } from "date-fns";

export function AeviaPanel({ variant = "rail" }: { variant?: "rail" | "hero" }) {
  const tasks = useStore((s) => s.tasks);
  const events = useStore((s) => s.events);
  const preferences = useStore((s) => s.plannerPreferences);
  const planWeek = useStore((s) => s.planWeek);
  const m = deriveMetrics(tasks, events, preferences);
  const [pulse, setPulse] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);

  function onPlan() {
    setPulse(true);
    const plan = planWeek();
    if (plan.scheduledMinutes === 0 && plan.unscheduled.length === 0) {
      setResult("Everything that can fit is already planned.");
    } else if (plan.unscheduled.length > 0) {
      setResult(`${plan.scheduledTaskCount} task${plan.scheduledTaskCount === 1 ? "" : "s"} planned · ${plan.unscheduled.length} need${plan.unscheduled.length === 1 ? "s" : ""} attention`);
    } else {
      setResult(`${plan.scheduledTaskCount} task${plan.scheduledTaskCount === 1 ? "" : "s"} planned · ${Math.round(plan.scheduledMinutes / 60 * 10) / 10}h placed`);
    }
    setTimeout(() => setPulse(false), 1500);
  }

  function onTaskCreated(taskId: string) {
    setPulse(true);
    const state = useStore.getState();
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) return;
    const scheduled = state.events
      .filter((event) => event.taskId === taskId && !event.cancelled)
      .sort((first, second) => first.start.localeCompare(second.start));

    if (scheduled.length === 0 && !task.deadline) {
      setResult("Task added · add a deadline for automatic scheduling.");
    } else if (scheduled.length === 0) {
      setResult("Task added · no open time was found before the deadline.");
    } else {
      const first = scheduled[0];
      const start = new Date(first.start);
      const end = addMinutes(start, first.durationMinutes);
      const scheduledMinutes = scheduled.reduce(
        (sum, event) => sum + event.durationMinutes,
        0
      );
      const remainingMinutes = Math.max(0, task.durationMinutes - scheduledMinutes);
      const extraSessions = scheduled.length - 1;
      setResult(
        `${remainingMinutes > 0 ? "Task partly scheduled" : "Task scheduled"} · ${format(start, "EEE, MMM d")} ${format(start, "HH:mm")}–${format(end, "HH:mm")}${extraSessions > 0 ? ` · ${extraSessions} more session${extraSessions === 1 ? "" : "s"}` : ""}${remainingMinutes > 0 ? ` · ${remainingMinutes}m still needs a slot` : ""}`
      );
    }
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
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Remaining" value={`${m.remainingHours}h`} />
          <Stat label="Available" value={`${m.availableHours}h`} />
          <Stat label="Scheduled" value={`${m.scheduledHours}h`} />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button onClick={() => setCaptureOpen(true)} className="btn btn-gold">
            Tell Aevia
          </button>
          <button onClick={() => setRecoveryOpen(true)} className="btn">
            My day changed
          </button>
          <button onClick={onPlan} className="btn">
            Replan this week
          </button>
        </div>
        {result && <p className="mt-3 text-[12px] text-fg-muted">{result}</p>}
        <p className="mt-3 text-[11px] text-fg-subtle">
          {formatHm(preferences.workStartMinutes)}–{formatHm(preferences.workEndMinutes)} workday · {formatHm(preferences.lunchStartMinutes)} lunch · {preferences.bufferMinutes}m buffer
        </p>
      </div>
      <CreateTaskModal
        open={captureOpen}
        onOpenChange={setCaptureOpen}
        onCreated={onTaskCreated}
      />
      <DayRecoveryModal open={recoveryOpen} onOpenChange={setRecoveryOpen} />
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
