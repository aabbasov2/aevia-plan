"use client";

import { Check, Clock } from "lucide-react";

type Block = {
  day: number;
  top: number;
  height: number;
  color: string;
  title: string;
  time: string;
  kind: "meeting" | "task";
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const HOURS = ["9", "10", "11", "12", "1", "2", "3", "4", "5"];
const ROW = 34;

const BLOCKS: Block[] = [
  { day: 0, top: 6, height: 36, color: "var(--block-4)", title: "Team sync", time: "9:00", kind: "meeting" },
  { day: 0, top: 106, height: 68, color: "var(--block-5)", title: "Aevia roadmap", time: "11:00", kind: "task" },
  { day: 1, top: 44, height: 62, color: "var(--block-2)", title: "Thesis outline", time: "10:00", kind: "task" },
  { day: 1, top: 172, height: 100, color: "var(--block-5)", title: "Sustainability", time: "12:30", kind: "task" },
  { day: 2, top: 6, height: 46, color: "var(--block-1)", title: "Gym", time: "9:00", kind: "meeting" },
  { day: 2, top: 108, height: 74, color: "var(--block-4)", title: "Design review", time: "11:30", kind: "meeting" },
  { day: 3, top: 62, height: 94, color: "var(--block-5)", title: "Presentation review", time: "10:30", kind: "task" },
  { day: 3, top: 214, height: 50, color: "var(--block-3)", title: "Follow up · Gary", time: "1:30", kind: "meeting" },
  { day: 4, top: 20, height: 140, color: "var(--block-5)", title: "Sustainability finish", time: "9:15", kind: "task" },
  { day: 4, top: 222, height: 44, color: "var(--block-6)", title: "Weekly review", time: "1:30", kind: "task" },
];

export function SlideProduct() {
  return (
    <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col justify-center px-24 py-24">
      <div className="wordmark mb-6 text-[10px] text-fg-subtle">
        05 · The product
      </div>

      <div className="flex items-baseline justify-between gap-10">
        <div>
          <h1
            className="serif text-fg"
            style={{
              fontSize: "56px",
              lineHeight: "62px",
              letterSpacing: "-0.02em",
              fontWeight: 400,
            }}
          >
            Meet Aevia Plan.
          </h1>
          <p className="mt-4 text-fg-muted text-[17px] leading-8 max-w-[520px]">
            You tell Aevia what needs to happen.
            <br />
            Aevia finds the time.
          </p>
        </div>
        <div className="hidden lg:block">
          <div className="flex items-center gap-2">
            <span className="chip">Today</span>
            <span className="chip">Tasks</span>
            <span
              className="chip"
              style={{
                borderColor: "var(--gold)",
                background: "var(--gold-soft)",
                color: "var(--fg)",
              }}
            >
              Calendar
            </span>
            <span className="chip">Commitments</span>
          </div>
        </div>
      </div>

      <div
        className="mt-10 card-raised p-6"
        style={{ boxShadow: "var(--elev-1)" }}
      >
        <div className="flex items-baseline justify-between">
          <div>
            <div className="wordmark text-[10px] text-fg-subtle">
              Weekly calendar
            </div>
            <div className="mt-1 text-fg text-[17px]">Mar 16 — Mar 20</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-fg-subtle text-[11px]">
              <span className="text-fg text-[14px]">22h</span> scheduled ·{" "}
              <span className="text-fg text-[14px]">12h</span> remaining
            </div>
            <span
              className="chip"
              style={{
                color: "var(--gold)",
                borderColor: "var(--gold-soft)",
                background: "var(--gold-soft)",
              }}
            >
              <Check size={10} />
              Plan Health · On track
            </span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-[42px_repeat(5,1fr)] gap-2">
          <div />
          {DAYS.map((d) => (
            <div
              key={d}
              className="pb-2 text-center text-fg-muted text-[11px] uppercase tracking-wider"
            >
              {d}
            </div>
          ))}
          <div className="relative">
            {HOURS.map((h, i) => (
              <div
                key={h}
                className="absolute w-full text-right pr-2 text-fg-subtle text-[10px]"
                style={{
                  top: i * ROW - 6,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {h}
              </div>
            ))}
            <div style={{ height: HOURS.length * ROW }} />
          </div>
          {DAYS.map((_, colIndex) => (
            <div
              key={colIndex}
              className="relative rounded-[8px] border border-[var(--border)] bg-[var(--surface)]/60"
              style={{ height: HOURS.length * ROW }}
            >
              {HOURS.map((_, i) => (
                <div
                  key={i}
                  className="absolute inset-x-0 border-t border-[var(--border)]/60"
                  style={{ top: i * ROW }}
                />
              ))}
              {BLOCKS.filter((b) => b.day === colIndex).map((b, idx) => (
                <div
                  key={idx}
                  className="absolute inset-x-1 overflow-hidden rounded-[6px] px-2 py-1.5"
                  style={{
                    top: b.top,
                    height: b.height,
                    background: b.color,
                    borderLeft: `2px solid ${b.kind === "task" ? "var(--gold)" : "var(--border-strong)"}`,
                  }}
                >
                  <div
                    className="text-fg text-[11px] leading-3 truncate"
                    style={{ fontWeight: 500 }}
                  >
                    {b.title}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-fg-muted text-[10px] leading-3">
                    <Clock size={9} />
                    {b.time}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-3">
        <Legend swatch="var(--block-5)" label="Aevia-planned work" gold />
        <Legend swatch="var(--block-4)" label="Meeting" />
        <Legend swatch="var(--block-2)" label="Focus" />
        <Legend swatch="var(--block-1)" label="Personal" />
      </div>
    </div>
  );
}

function Legend({
  swatch,
  label,
  gold = false,
}: {
  swatch: string;
  label: string;
  gold?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="h-3 w-3 rounded-[3px]"
        style={{
          background: swatch,
          borderLeft: `2px solid ${gold ? "var(--gold)" : "var(--border-strong)"}`,
        }}
      />
      <span className="text-fg-muted text-[12px]">{label}</span>
    </div>
  );
}
