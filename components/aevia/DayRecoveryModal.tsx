"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, LoaderCircle, RotateCcw, X } from "lucide-react";
import { format } from "date-fns";
import { formatHm } from "@/lib/time";
import { useStore, type RecoveryChange } from "@/lib/store";
import type { DayRecoveryProposal } from "@/lib/recovery";

type Interpretation = {
  kind: "unavailable_window" | "meeting_overrun" | "clarification";
  date: string;
  startTime: string;
  endTime: string;
  eventId: string;
  newEndTime: string;
  summary: string;
  clarification: string;
};

export function DayRecoveryModal({ open, onOpenChange, initialDescription }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDescription?: string;
}) {
  const events = useStore((state) => state.events);
  const preferences = useStore((state) => state.plannerPreferences);
  const previewDayRecovery = useStore((state) => state.previewDayRecovery);
  const applyDayRecovery = useStore((state) => state.applyDayRecovery);
  const undoDayRecovery = useStore((state) => state.undoDayRecovery);
  const [description, setDescription] = useState("");
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null);
  const [proposal, setProposal] = useState<DayRecoveryProposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [undone, setUndone] = useState(false);

  useEffect(() => {
    if (open) {
      setDescription(initialDescription ?? "");
      setInterpretation(null);
      setProposal(null);
      setError(null);
      setBusy(false);
      setComplete(false);
      setUndone(false);
    }
  }, [initialDescription, open]);

  if (!open) return null;

  async function understandChange() {
    if (!description.trim() || busy) return;
    setBusy(true);
    setError(null);
    setInterpretation(null);
    setProposal(null);
    try {
      const now = new Date();
      const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const calendarEvents = events
        .filter((event) => !event.cancelled && new Date(event.start) >= new Date(now.getTime() - 12 * 60 * 60_000))
        .slice(0, 100)
        .map((event) => ({ id: event.id, title: event.title, start: event.start, durationMinutes: event.durationMinutes, kind: event.kind }));
      const response = await fetch("/api/ai/interpret-disruption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: description,
          today: localToday,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          workEndTime: formatHm(preferences.workEndMinutes),
          events: calendarEvents,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Aevia couldn't understand that change.");
      setInterpretation(data as Interpretation);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Aevia couldn't understand that change.");
    } finally {
      setBusy(false);
    }
  }

  function previewPlan() {
    if (!interpretation || interpretation.kind === "clarification") return;
    setError(null);
    let change: RecoveryChange;
    if (interpretation.kind === "unavailable_window") {
      const start = new Date(`${interpretation.date}T${interpretation.startTime}:00`);
      const end = new Date(`${interpretation.date}T${interpretation.endTime}:00`);
      const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60_000);
      if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
        setError("That time window doesn't look right. Please describe its start and end time.");
        return;
      }
      change = {
        reason: interpretation.summary,
        targetDate: interpretation.date,
        unavailableEvent: {
          title: "Unavailable · schedule recovery",
          start: start.toISOString(),
          durationMinutes,
          kind: "personal",
          origin: "user",
          project: "personal",
          locked: true,
        },
      };
    } else {
      const event = events.find((item) => item.id === interpretation.eventId);
      if (!event) {
        setError("That event changed or was removed. Please describe the change again.");
        return;
      }
      const newEnd = new Date(`${interpretation.date}T${interpretation.newEndTime}:00`);
      const durationMinutes = Math.round((newEnd.getTime() - new Date(event.start).getTime()) / 60_000);
      if (!Number.isFinite(durationMinutes) || durationMinutes <= event.durationMinutes) {
        setError("The new end time needs to be later than the event's current end.");
        return;
      }
      change = {
        reason: interpretation.summary,
        targetDate: interpretation.date,
        updatedEvent: { id: event.id, start: event.start, durationMinutes },
      };
    }
    const nextProposal = previewDayRecovery(change);
    if (!nextProposal) {
      setError("Aevia couldn't create a new plan from that change. Try a more specific time.");
      return;
    }
    setProposal(nextProposal);
  }

  function applyPlan() {
    if (!proposal) return;
    applyDayRecovery(proposal);
    setComplete(true);
  }

  function undoPlan() {
    setUndone(undoDayRecovery());
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--overlay)] p-4" onClick={() => onOpenChange(false)}>
      <div className="card-raised max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto p-5 sm:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="wordmark text-[10px] text-fg-muted">AEVIA · PLAN RECOVERY</div>
            <h2 className="h2 mt-1 text-fg">{complete ? "Your plan is updated" : proposal ? "Review the new plan" : "What changed?"}</h2>
          </div>
          <button className="btn-ghost btn h-8 w-8 p-0" onClick={() => onOpenChange(false)} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        {complete ? (
          <div className="space-y-4">
            <p className="text-[13px] text-fg-muted">{undone ? "The previous schedule has been restored." : "Aevia moved flexible task sessions around the change."}</p>
            {!undone && (
              <button className="btn" onClick={undoPlan}><RotateCcw size={13} /> Undo replan</button>
            )}
          </div>
        ) : proposal ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="wordmark text-[10px] text-fg-muted">CHANGE</div>
              <p className="mt-1 text-[13px] text-fg">{proposal.reason}</p>
            </div>
            {proposal.removedEvents.length > 0 && (
              <div className="rounded-lg border border-[var(--border)] p-4">
                <div className="wordmark text-[10px] text-fg-muted">CURRENT TASK BLOCKS AEVIA WILL REPLAN</div>
                <ul className="mt-2 space-y-1.5">
                  {proposal.removedEvents.map((event) => (
                    <li key={event.id} className="text-[12px] text-fg-muted">{event.title} · {format(new Date(event.start), "EEE, MMM d · HH:mm")} ({event.durationMinutes}m)</li>
                  ))}
                </ul>
              </div>
            )}
            {proposal.proposedTaskEvents.length > 0 && (
              <div className="rounded-lg border border-[var(--border)] p-4">
                <div className="wordmark text-[10px] text-fg-muted">PROPOSED SCHEDULE</div>
                <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
                  {proposal.proposedTaskEvents.map((event, index) => (
                    <li key={`${event.taskId}-${event.start}-${index}`} className="text-[12px] text-fg">{event.title} · {format(new Date(event.start), "EEE, MMM d · HH:mm")} ({event.durationMinutes}m)</li>
                  ))}
                </ul>
              </div>
            )}
            {proposal.atRiskTaskTitles.length > 0 && (
              <div className="flex gap-2 rounded-lg border border-[#d39a76]/35 bg-[#d39a76]/[0.08] p-3 text-[12px] text-fg">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[#d39a76]" />
                Still at risk before deadline: {proposal.atRiskTaskTitles.join(", ")}.
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button className="btn" onClick={() => setProposal(null)}><ArrowLeft size={13} /> Back</button>
              <button className="btn btn-gold" onClick={applyPlan}>Apply new plan</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[13px] leading-5 text-fg-muted">Tell Aevia what disrupted your day. It will keep your fixed events in place and suggest a new schedule for flexible task blocks.</p>
            <textarea
              className="input"
              rows={4}
              maxLength={2000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={'I can’t work after 3 today.\n\nMy 10am project review ran 45 minutes over.'}
              autoFocus
            />
            {interpretation?.kind === "clarification" && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-[12px] text-fg-muted">{interpretation.clarification || "What date and time should Aevia block?"}</div>
            )}
            {interpretation && interpretation.kind !== "clarification" && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="wordmark text-[10px] text-fg-muted">AEVIA UNDERSTOOD</div>
                <p className="mt-1 text-[12px] text-fg">{interpretation.summary}</p>
                <div className="mt-3 flex gap-2">
                  <button className="btn" onClick={() => setInterpretation(null)}>Edit description</button>
                  <button className="btn btn-gold" onClick={previewPlan}>Preview replan</button>
                </div>
              </div>
            )}
            {error && <p role="alert" className="text-[12px] text-[#d39a76]">{error}</p>}
            {!interpretation && (
              <div className="flex justify-end gap-2">
                <button className="btn" onClick={() => onOpenChange(false)}>Cancel</button>
                <button className="btn btn-gold" onClick={understandChange} disabled={!description.trim() || busy}>
                  {busy ? <><LoaderCircle size={13} className="animate-spin" /> Understanding…</> : "Understand change"}
                </button>
              </div>
            )}
            {interpretation?.kind === "clarification" && (
              <div className="flex justify-end gap-2">
                <button className="btn" onClick={() => onOpenChange(false)}>Cancel</button>
                <button className="btn btn-gold" onClick={() => setInterpretation(null)}>Edit description</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
