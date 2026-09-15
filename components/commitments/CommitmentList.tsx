"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { CommitmentCard } from "./CommitmentCard";
import { AeviaArc } from "@/components/brand/AeviaArc";
import type { Commitment } from "@/lib/types";
import { nextDue } from "@/lib/commitments";

const GROUPS: { label: string; match: (c: Commitment) => boolean }[] = [
  {
    label: "Weekly",
    match: (c) => c.cadence.kind === "daily" || c.cadence.kind === "weekly",
  },
  {
    label: "Monthly",
    match: (c) =>
      c.cadence.kind === "monthly" || c.cadence.kind === "monthly-first-week",
  },
  {
    label: "Quarterly & Yearly",
    match: (c) => c.cadence.kind === "quarterly" || c.cadence.kind === "yearly",
  },
];

export function CommitmentList() {
  const commitments = useStore((s) => s.commitments);

  const grouped = useMemo(() => {
    const now = new Date();
    return GROUPS.map((g) => ({
      label: g.label,
      items: commitments
        .filter(g.match)
        .sort(
          (a, b) => nextDue(a.cadence, now).getTime() - nextDue(b.cadence, now).getTime()
        ),
    }));
  }, [commitments]);

  if (commitments.length === 0) {
    return (
      <div className="card flex flex-col items-center py-16 text-center">
        <AeviaArc size={40} />
        <div className="mt-5 text-fg text-[16px]">No commitments yet.</div>
        <p className="mt-1 meta">
          Rent, reports, filings — anything that repeats on its own schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {grouped.map((g) =>
        g.items.length === 0 ? null : (
          <section key={g.label}>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="wordmark text-[11px] text-fg-muted">{g.label}</h3>
              <span className="text-fg-subtle text-[11px]">{g.items.length}</span>
            </div>
            <div className="space-y-2">
              {g.items.map((c) => (
                <CommitmentCard key={c.id} c={c} />
              ))}
            </div>
          </section>
        )
      )}
    </div>
  );
}
