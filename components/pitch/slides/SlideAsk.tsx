"use client";

import { SlideFrame } from "../SlideFrame";
import { AeviaArc } from "@/components/brand/AeviaArc";

const CTO_OWNS = [
  "Architecture",
  "Planning engine",
  "AI infrastructure",
  "Technical strategy",
];

const CAPITAL_USES = [
  "Engineering",
  "AI inference",
  "Product & design",
  "Launch / GTM",
  "Runway",
];

export function SlideAsk() {
  return (
    <SlideFrame label="19 · The ask">
      <h1
        className="serif text-fg"
        style={{
          fontSize: "56px",
          lineHeight: "62px",
          letterSpacing: "-0.02em",
          fontWeight: 400,
        }}
      >
        Build the wedge.
        <br />
        Prove the engine.
        <br />
        <span className="text-gold italic">Expand the system.</span>
      </h1>

      <div className="mt-14 grid grid-cols-2 gap-8">
        <div className="rounded-[14px] border border-[var(--gold)] bg-[var(--gold-soft)] p-6">
          <div className="flex items-center gap-3">
            <AeviaArc size={20} />
            <span className="wordmark text-[10px] text-gold">
              For a CTO
            </span>
          </div>
          <div
            className="serif mt-6 text-fg"
            style={{
              fontSize: "30px",
              lineHeight: "36px",
              letterSpacing: "-0.02em",
              fontWeight: 400,
            }}
          >
            Join as founding technical leader.
          </div>
          <div className="mt-6">
            <div className="wordmark text-[10px] text-fg-subtle">Own</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {CTO_OWNS.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-[var(--gold)]/50 bg-[var(--surface)] px-3 py-1 text-fg text-[13px]"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <span className="wordmark text-[10px] text-fg-subtle">
            For investors
          </span>
          <div
            className="serif mt-6 text-fg"
            style={{
              fontSize: "30px",
              lineHeight: "36px",
              letterSpacing: "-0.02em",
              fontWeight: 400,
            }}
          >
            Capital funds execution, not narrative.
          </div>
          <div className="mt-6">
            <div className="wordmark text-[10px] text-fg-subtle">Used for</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {CAPITAL_USES.map((c) => (
                <div
                  key={c}
                  className="flex items-center gap-2 text-fg text-[14px]"
                >
                  <span className="h-1 w-1 rounded-full bg-[var(--gold)]" />
                  {c}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-10 max-w-[900px] text-fg-subtle text-[12px] italic">
        No fundraising amount, valuation, users, revenue, or partnerships are
        claimed here. The commitment is to execute the wedge with discipline.
      </p>
    </SlideFrame>
  );
}
