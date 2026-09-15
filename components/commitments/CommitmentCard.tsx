"use client";

import { Repeat, Trash2 } from "lucide-react";
import { blockColor, PROJECTS } from "@/lib/projects";
import { cadenceLabel, nextDueLabel } from "@/lib/commitments";
import { humanDuration } from "@/lib/time";
import type { Commitment } from "@/lib/types";
import { useStore } from "@/lib/store";

export function CommitmentCard({ c }: { c: Commitment }) {
  const project = PROJECTS[c.project];
  const remove = useStore((s) => s.removeCommitment);
  return (
    <div className="group card p-4 transition-colors hover:border-[var(--border-strong)]">
      <div className="flex items-start gap-3">
        <div
          className="mt-1 h-8 w-1 rounded-full"
          style={{ background: blockColor(c.colorIndex) }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-fg text-[15px] leading-5 truncate">
              {c.title}
            </span>
            <span className="chip">
              <Repeat size={10} />
              {cadenceLabel(c.cadence)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 meta">
            <span>Next: {nextDueLabel(c)}</span>
            {c.estimatedMinutes ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{humanDuration(c.estimatedMinutes)} each time</span>
              </>
            ) : null}
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: project.dot }}
              />
              {project.label}
            </span>
          </div>
          {c.notes && (
            <p className="mt-2 text-fg-muted text-[12px] leading-5">{c.notes}</p>
          )}
        </div>
        <button
          onClick={() => remove(c.id)}
          className="btn btn-ghost h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Remove commitment"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
