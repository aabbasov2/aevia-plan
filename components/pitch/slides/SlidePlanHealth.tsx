"use client";

import { AlertTriangle, Check, Clock } from "lucide-react";
import { Reveal, useStep } from "../Reveal";

const CONSIDERS = [
  "Deadline",
  "Duration",
  "Capacity",
  "Dependencies",
  "Existing commitments",
];

export function SlidePlanHealth() {
  const step = useStep();
  return (
    <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col justify-center px-24 py-24">
      <div className="wordmark mb-6 text-[10px] text-fg-subtle">
        07 · Plan Health
      </div>

      <h1
        className="serif text-fg"
        style={{
          fontSize: "52px",
          lineHeight: "58px",
          letterSpacing: "-0.02em",
          fontWeight: 400,
        }}
      >
        Is there actually enough time?
      </h1>

      <div className="mt-10 grid grid-cols-3 gap-4">
        <HealthCard
          state="on-track"
          title="On track"
          body="Everything fits."
          primary="12h 30m"
          primaryLabel="Remaining"
          secondary="15h"
          secondaryLabel="Available"
        />
        <HealthCard
          state="needs-attention"
          title="Needs attention"
          body="The plan needs adjustment."
          primary="6h"
          primaryLabel="Remaining"
          secondary="3h"
          secondaryLabel="Scheduled"
        />
        <HealthCard
          state="wont-fit"
          title="Won't fit"
          body="You need 4h more before Friday."
          primary="8h"
          primaryLabel="Needed"
          secondary="4h"
          secondaryLabel="Available"
        />
      </div>

      <Reveal at={1}>
        <div className="mt-12 grid grid-cols-[1fr_auto_1.2fr] items-center gap-10">
          <div className="text-right">
            <div className="serif text-fg-muted text-[26px] leading-9 italic space-y-1">
              <div>No High.</div>
              <div>No Medium.</div>
              <div>No Low.</div>
            </div>
          </div>
          <div className="flex h-full flex-col items-center justify-center">
            <div className="h-12 w-px bg-[var(--gold)]" />
            <span
              className="wordmark my-2 text-[9px] text-gold"
              style={{ letterSpacing: "0.4em" }}
            >
              Instead
            </span>
            <div className="h-12 w-px bg-[var(--gold)]" />
          </div>
          <div>
            <p
              className="serif text-fg"
              style={{
                fontSize: "32px",
                lineHeight: "40px",
                letterSpacing: "-0.02em",
                fontWeight: 400,
              }}
            >
              Aevia reasons about the workload.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {CONSIDERS.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-fg text-[12px]"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function HealthCard({
  state,
  title,
  body,
  primary,
  primaryLabel,
  secondary,
  secondaryLabel,
}: {
  state: "on-track" | "needs-attention" | "wont-fit";
  title: string;
  body: string;
  primary: string;
  primaryLabel: string;
  secondary: string;
  secondaryLabel: string;
}) {
  const colorMap = {
    "on-track": { fg: "var(--gold)", icon: <Check size={12} /> },
    "needs-attention": { fg: "#D6A24B", icon: <Clock size={12} /> },
    "wont-fit": { fg: "#B87259", icon: <AlertTriangle size={12} /> },
  }[state];
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="wordmark text-[10px] text-fg-subtle">Plan Health</span>
        <span
          className="flex items-center gap-1.5 text-[11px] font-medium"
          style={{ color: colorMap.fg }}
        >
          {colorMap.icon}
          {title}
        </span>
      </div>
      <p className="mt-3 text-fg text-[16px] leading-7">{body}</p>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Stat label={primaryLabel} value={primary} color={colorMap.fg} />
        <Stat label={secondaryLabel} value={secondary} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <div className="wordmark text-[9px] text-fg-subtle">{label}</div>
      <div
        className="mt-1 text-[24px] leading-7"
        style={{
          fontVariantNumeric: "tabular-nums",
          color: color ?? "var(--fg)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
