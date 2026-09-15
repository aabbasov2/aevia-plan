"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { CommitmentList } from "@/components/commitments/CommitmentList";
import { CreateCommitmentModal } from "@/components/commitments/CreateCommitmentModal";
import { useStore } from "@/lib/store";
import { humanDuration } from "@/lib/time";

export default function CommitmentsPage() {
  const [open, setOpen] = useState(false);
  const commitments = useStore((s) => s.commitments);

  const totalMonthlyMinutes = commitments.reduce((sum, c) => {
    const each = c.estimatedMinutes ?? 0;
    switch (c.cadence.kind) {
      case "daily":
        return sum + each * 30;
      case "weekly":
        return sum + each * 4;
      case "monthly":
      case "monthly-first-week":
        return sum + each;
      case "quarterly":
        return sum + each / 3;
      case "yearly":
        return sum + each / 12;
    }
  }, 0);

  return (
    <div className="mx-auto max-w-[1240px] px-10 py-14">
      <div className="grid grid-cols-[1fr_320px] gap-10">
        <div className="fade-in">
          <div className="flex items-end justify-between">
            <div>
              <div className="wordmark text-[11px] text-fg-muted">COMMITMENTS</div>
              <h1 className="display mt-2 text-fg">Things you owe your time to.</h1>
              <p className="mt-2 text-fg-muted text-[15px]">
                Set the cadence — Aevia will keep them on your radar.
              </p>
            </div>
            <button className="btn btn-gold" onClick={() => setOpen(true)}>
              <Plus size={14} /> New commitment
            </button>
          </div>

          <div className="mt-10">
            <CommitmentList />
          </div>
        </div>

        <aside>
          <div className="card p-5">
            <div className="wordmark text-[11px] text-fg-muted">This month</div>
            <div className="mt-3 flex items-baseline gap-1">
              <span
                className="text-fg text-[32px] leading-9"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {humanDuration(Math.round(totalMonthlyMinutes))}
              </span>
              <span className="text-fg-muted text-[13px]">est. per month</span>
            </div>
            <p className="mt-3 meta">
              Rough time your commitments will need this month. Aevia will find slots for them.
            </p>
          </div>
        </aside>
      </div>

      <CreateCommitmentModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
