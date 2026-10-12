"use client";

import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import type { ConflictReplanProposal } from "@/lib/store";

export function ConflictReplanPanel({
  proposal,
  onApply,
  onDismiss,
}: {
  proposal: ConflictReplanProposal;
  onApply: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#d39a76]/35 bg-[#d39a76]/[0.08] p-4">
        <div className="flex items-center gap-2 text-[13px] font-medium text-fg">
          <AlertTriangle size={15} className="shrink-0 text-[#d39a76]" />
          {proposal.conflicts.length ? "This event overlaps with Aevia’s plan" : "These calendar events overlap"}
        </div>
        <p className="mt-1 text-[12px] leading-5 text-fg-muted">Your event is on the calendar. It overlaps with:</p>
        <ul className="mt-3 space-y-2">
          {proposal.overlaps.map((event) => (
            <li key={event.id} className="text-[12px] text-fg">
              {event.title} · {format(new Date(event.start), "EEE, MMM d · HH:mm")}
            </li>
          ))}
        </ul>
        {proposal.conflicts.length > 0 && (
          <p className="mt-3 text-[11px] leading-4 text-fg-muted">Aevia will reflow flexible task blocks across this week to make room.</p>
        )}
      </div>

      {proposal.displaced.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="wordmark text-[10px] text-fg-muted">CURRENT AEVIA BLOCKS TO MOVE OR REMOVE</div>
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
            <p className="mt-3 text-[12px] text-[#d39a76]">Couldn’t fit all remaining time for: {proposal.unscheduledTaskTitles.join(", ")}. Any other existing blocks for these tasks will stay.</p>
          )}
        </div>
      ) : proposal.conflicts.length === 0 ? (
        <p className="text-[12px] text-fg-muted">There are no movable Aevia task sessions in this overlap. You can adjust one of the events on the calendar.</p>
      ) : (
        <p className="text-[12px] text-[#d39a76]">Aevia couldn’t find another open time this week. Applying will remove the overlapping Aevia block; its other non-overlapping blocks will stay.</p>
      )}

      <div className="flex justify-end gap-2">
        <button className="btn" onClick={onDismiss}>
          {proposal.conflicts.length ? "Keep schedule" : "Got it"}
        </button>
        <button className="btn btn-gold" onClick={onApply} disabled={proposal.replacements.length === 0 && proposal.displaced.length === 0}>
          {proposal.replacements.length > 0 ? "Apply suggested times" : "Remove overlapping task block"}
        </button>
      </div>
    </div>
  );
}
