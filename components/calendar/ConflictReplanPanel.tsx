"use client";

import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import type { ConflictReplanProposal } from "@/lib/store";

export function ConflictReplanPanel({
  proposal,
  onApply,
  onDismiss,
}: {
  proposal: ConflictReplanProposal;
  onApply: () => boolean;
  onDismiss: () => void;
}) {
  const [applyError, setApplyError] = useState("");
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#d39a76]/35 bg-[#d39a76]/[0.08] p-4">
        <div className="flex items-center gap-2 text-[13px] font-medium text-fg">
          <AlertTriangle size={15} className="shrink-0 text-[#d39a76]" />
          {proposal.conflicts.length ? "This event overlaps with Aevia’s plan" : "These calendar events overlap"}
        </div>
        <p className="mt-1 text-[12px] leading-5 text-fg-muted">Aevia found genuine time conflicts. Review the shared intervals and suggested next step:</p>
        <ul className="mt-3 space-y-2">
          {proposal.details.map((overlap) => (
            <li key={overlap.key} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[12px] text-fg">
              <p>{overlap.first.title} <span className="text-fg-subtle">and</span> {overlap.second.title}</p>
              <p className="mt-1 text-[10px] text-fg-muted">{format(new Date(overlap.start), "EEE, MMM d · HH:mm")}–{format(new Date(overlap.end), "HH:mm")} · {overlap.type.replaceAll("-", " ")}</p>
              <p className="mt-1 text-[10px] text-fg-subtle">{overlap.recommendation}</p>
            </li>
          ))}
        </ul>
        {proposal.conflicts.length > 0 && (
          <p className="mt-3 text-[11px] leading-4 text-fg-muted">Aevia will reflow flexible task blocks across this week to make room.</p>
        )}
      </div>

      {proposal.displaced.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="wordmark text-[10px] text-fg-muted">AEVIA TASK BLOCKS TO MOVE</div>
          <ul className="mt-2 max-h-36 space-y-2 overflow-y-auto">
            {proposal.displaced.map((event) => (
              <li key={event.id} className="text-[12px] text-fg-muted">
                {event.title} · {format(new Date(event.start), "EEE, MMM d · HH:mm")} ({event.durationMinutes}m)
              </li>
            ))}
          </ul>
        </div>
      )}

      {proposal.replacements.length > 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="wordmark text-[10px] text-fg-muted">SUGGESTED NEW TIMES</div>
          <ul className="mt-2 space-y-2">
            {proposal.replacements.map((event, index) => (
              <li key={`${event.taskId}-${event.start}-${index}`} className="text-[12px] text-fg">
                {event.title} · {format(new Date(event.start), "EEE, MMM d · HH:mm")} ({event.durationMinutes}m)
              </li>
            ))}
          </ul>
          {proposal.unscheduledTaskTitles.length > 0 && (
            <p className="mt-3 text-[12px] text-[#d39a76]">No complete alternative fits this week for: {proposal.unscheduledTaskTitles.join(", ")}. Their existing blocks and task time will be kept; choose another time or adjust the task constraints.</p>
          )}
        </div>
      ) : proposal.conflicts.length === 0 ? (
        <p className="text-[12px] text-fg-muted">There are no movable Aevia task sessions in this overlap. You can adjust one of the events on the calendar.</p>
      ) : (
        <p className="text-[12px] text-[#d39a76]">Aevia couldn’t find a complete alternative this week. Existing task blocks will stay in place.</p>
      )}

      {applyError && <p role="alert" className="text-[11px] text-[#d39a76]">{applyError}</p>}
      <div className="flex justify-end gap-2">
        <button className="btn" onClick={onDismiss}>
          {proposal.conflicts.length ? "Keep schedule" : "Got it"}
        </button>
        <button className="btn btn-gold" onClick={() => { setApplyError(""); if (!onApply()) setApplyError("The calendar changed while this suggestion was open. Review the latest schedule and try again."); }} disabled={proposal.replacements.length === 0 || proposal.displaced.length === 0}>
          Apply suggested times
        </button>
      </div>
    </div>
  );
}
