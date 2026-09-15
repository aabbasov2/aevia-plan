"use client";

import { AeviaArc } from "@/components/brand/AeviaArc";
import { useStep } from "../Reveal";
import { Check, CalendarClock, Clock } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const HOURS = ["9", "10", "11", "12", "1", "2", "3", "4", "5"];
const ROW = 30;

type Fixed = {
  day: number;
  top: number;
  height: number;
  color: string;
  title: string;
};

const FIXED: Fixed[] = [
  { day: 0, top: 4, height: 30, color: "var(--block-4)", title: "Team sync" },
  { day: 1, top: 76, height: 40, color: "var(--block-2)", title: "Review" },
  { day: 2, top: 6, height: 34, color: "var(--block-1)", title: "Gym" },
  { day: 3, top: 128, height: 42, color: "var(--block-3)", title: "Follow up" },
];

type Placed = {
  day: number;
  top: number;
  height: number;
  duration: string;
};

const INITIAL_PLAN: Placed[] = [
  { day: 0, top: 44, height: 44, duration: "1h 30m" },
  { day: 1, top: 4, height: 66, duration: "2h" },
  { day: 2, top: 122, height: 44, duration: "1h 30m" },
  { day: 3, top: 32, height: 30, duration: "1h" },
];

const CONFLICT: Fixed = {
  day: 2,
  top: 122,
  height: 60,
  color: "var(--block-4)",
  title: "Investor call",
};

const REPLAN: Placed[] = [
  { day: 0, top: 44, height: 44, duration: "1h 30m" },
  { day: 1, top: 4, height: 66, duration: "2h" },
  { day: 3, top: 32, height: 44, duration: "1h 30m" },
  { day: 4, top: 4, height: 30, duration: "1h" },
];

export function SlideDemo() {
  const step = useStep();
  return (
    <div className="mx-auto flex h-full w-full max-w-[1520px] flex-col justify-center px-24 py-24">
      <div className="mb-6 flex items-center justify-between">
        <div className="wordmark text-[10px] text-fg-subtle">
          06 · The demo
        </div>
        <div className="flex items-center gap-3">
          <AeviaArc size={16} pulse={step >= 1 && step <= 3} />
          <span className="wordmark text-[10px] text-gold">
            {stepLabel(step)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[400px_1fr] gap-8">
        {/* Left column — intent, parsed fields, running plan */}
        <div className="space-y-4">
          {/* User intent */}
          <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="wordmark text-[10px] text-fg-subtle">
              You say
            </div>
            <p className="serif mt-3 text-fg italic text-[19px] leading-8">
              &ldquo;Finish my sustainability project by Friday. It needs
              6 hours.&rdquo;
            </p>
          </div>

          {/* Parsed understanding */}
          <div
            className="rounded-[12px] p-5 transition-all duration-500"
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor:
                step >= 1 ? "var(--gold)" : "var(--border)",
              background:
                step >= 1 ? "var(--gold-soft)" : "var(--surface)",
              opacity: step >= 1 ? 1 : 0.35,
            }}
          >
            <div
              className="wordmark text-[10px]"
              style={{
                color: step >= 1 ? "var(--gold)" : "var(--fg-subtle)",
              }}
            >
              Aevia understands
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <Field label="Task" value="Sustainability project" />
              <Field label="Duration" value="6h" />
              <Field label="Deadline" value="Friday" />
              <Field
                label="Change"
                value={step >= 5 ? "Deadline pulled in" : "—"}
                muted
                highlight={step >= 5}
              />
            </div>
          </div>

          {/* Status */}
          <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="wordmark text-[10px] text-fg-subtle">
              Status
            </div>
            <ul className="mt-3 space-y-2 text-fg-muted text-[13px] leading-6">
              <StatusItem active={step >= 2}>
                Scanned calendar · 5 days · Mon–Fri
              </StatusItem>
              <StatusItem active={step >= 3}>
                Placed 6h across 4 focus slots
              </StatusItem>
              <StatusItem active={step >= 4} warn>
                Meeting added Wed afternoon
              </StatusItem>
              <StatusItem active={step >= 5} gold>
                Replanned around the conflict
              </StatusItem>
            </ul>
          </div>
        </div>

        {/* Right column — calendar */}
        <div
          className="card-raised p-5"
          style={{ boxShadow: "var(--elev-1)" }}
        >
          <div className="flex items-baseline justify-between">
            <div>
              <div className="wordmark text-[10px] text-fg-subtle">
                Weekly calendar
              </div>
              <div className="mt-1 text-fg text-[15px]">
                Mar 16 — Mar 20
              </div>
            </div>
            <span
              className="chip"
              style={{
                color: step >= 5 ? "var(--gold)" : "var(--fg-muted)",
                borderColor: step >= 5 ? "var(--gold-soft)" : "var(--border)",
                background: step >= 5 ? "var(--gold-soft)" : "transparent",
                transition: "all 400ms ease",
              }}
            >
              <Check size={10} /> On track
            </span>
          </div>

          <div className="mt-4 grid grid-cols-[36px_repeat(5,1fr)] gap-1.5">
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
                  className="absolute w-full text-right pr-1.5 text-fg-subtle text-[10px]"
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
                className="relative rounded-[6px] border border-[var(--border)] bg-[var(--surface)]/60"
                style={{ height: HOURS.length * ROW }}
              >
                {/* hour rules */}
                {HOURS.map((_, i) => (
                  <div
                    key={i}
                    className="absolute inset-x-0 border-t border-[var(--border)]/50"
                    style={{ top: i * ROW }}
                  />
                ))}

                {/* Available-time shimmer at step 2 */}
                {step === 2 &&
                  isAvailable(colIndex).map((slot, i) => (
                    <div
                      key={i}
                      className="absolute inset-x-1 rounded-[4px] border border-dashed border-[var(--gold)] bg-[var(--gold-soft)]"
                      style={{
                        top: slot.top,
                        height: slot.height,
                        animation: "fade-in 400ms ease both",
                        animationDelay: `${i * 60}ms`,
                      }}
                    />
                  ))}

                {/* Fixed items */}
                {FIXED.filter((b) => b.day === colIndex).map((b, idx) => (
                  <div
                    key={idx}
                    className="absolute inset-x-1 overflow-hidden rounded-[4px] border-l-2 px-1.5 py-1"
                    style={{
                      top: b.top,
                      height: b.height,
                      background: b.color,
                      borderLeftColor: "var(--border-strong)",
                    }}
                  >
                    <div
                      className="text-fg text-[10px] leading-3 truncate"
                      style={{ fontWeight: 500 }}
                    >
                      {b.title}
                    </div>
                  </div>
                ))}

                {/* Conflict — Wed investor call at step >= 4 */}
                {colIndex === 2 && step >= 4 && (
                  <div
                    className="absolute inset-x-1 overflow-hidden rounded-[4px] border-l-2 px-1.5 py-1"
                    style={{
                      top: CONFLICT.top,
                      height: CONFLICT.height,
                      background: CONFLICT.color,
                      borderLeftColor:
                        step === 4 ? "#B87259" : "var(--border-strong)",
                      animation:
                        step === 4
                          ? "fade-in 400ms ease both"
                          : "fade-in 300ms ease both",
                    }}
                  >
                    <div
                      className="text-fg text-[10px] leading-3 truncate"
                      style={{ fontWeight: 500 }}
                    >
                      {CONFLICT.title}
                    </div>
                    {step === 4 && (
                      <div
                        className="mt-0.5 text-[9px] leading-3"
                        style={{ color: "#B87259" }}
                      >
                        Conflict
                      </div>
                    )}
                  </div>
                )}

                {/* Placed sustainability blocks */}
                {getPlacedBlocks(step)
                  .filter((b) => b.day === colIndex)
                  .map((b, idx) => (
                    <div
                      key={`p-${colIndex}-${idx}-${step}`}
                      className="absolute inset-x-1 overflow-hidden rounded-[4px] border-l-2 px-1.5 py-1"
                      style={{
                        top: b.top,
                        height: b.height,
                        background: "var(--block-5)",
                        borderLeftColor: "var(--gold)",
                        animation: "fade-in 400ms ease both",
                      }}
                    >
                      <div
                        className="text-fg text-[10px] leading-3 truncate"
                        style={{ fontWeight: 500 }}
                      >
                        Sustainability
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-fg-muted text-[9px] leading-3">
                        <Clock size={8} />
                        {b.duration}
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between text-fg-muted text-[11px]">
            <span className="flex items-center gap-2">
              <CalendarClock size={12} />
              6h needed · {planPlaced(step)}h placed
            </span>
            <span className="text-fg-subtle">
              Aevia only touched gold-marked blocks
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function stepLabel(step: number) {
  const labels = [
    "You state the intent",
    "Aevia parses the request",
    "Aevia scans available time",
    "Aevia places the work",
    "Conflict appears",
    "Aevia re-plans",
  ];
  return labels[step] ?? labels[0];
}

function planPlaced(step: number) {
  if (step < 3) return 0;
  return 6;
}

function getPlacedBlocks(step: number): Placed[] {
  if (step < 3) return [];
  if (step === 3) return INITIAL_PLAN;
  if (step === 4) return INITIAL_PLAN;
  return REPLAN;
}

function isAvailable(day: number) {
  const map: Record<number, { top: number; height: number }[]> = {
    0: [{ top: 40, height: 90 }],
    1: [{ top: 4, height: 70 }, { top: 120, height: 100 }],
    2: [{ top: 44, height: 70 }],
    3: [{ top: 40, height: 80 }],
    4: [{ top: 4, height: 200 }],
  };
  return map[day] ?? [];
}

function Field({
  label,
  value,
  muted = false,
  highlight = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="wordmark text-[9px] text-fg-subtle">{label}</span>
      <span
        className={`serif text-[16px] leading-6 ${
          muted && !highlight ? "text-fg-subtle" : "text-fg"
        }`}
        style={{
          fontStyle: highlight ? "italic" : "normal",
          color: highlight ? "var(--gold)" : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function StatusItem({
  children,
  active,
  warn = false,
  gold = false,
}: {
  children: React.ReactNode;
  active: boolean;
  warn?: boolean;
  gold?: boolean;
}) {
  const color = !active
    ? "var(--fg-subtle)"
    : warn
      ? "#D6A24B"
      : gold
        ? "var(--gold)"
        : "var(--fg)";
  return (
    <li
      className="flex items-start gap-2 transition-colors duration-500"
      style={{ color }}
    >
      <span
        className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full transition-colors duration-500"
        style={{ background: color }}
      />
      <span className="text-[13px] leading-6">{children}</span>
    </li>
  );
}
