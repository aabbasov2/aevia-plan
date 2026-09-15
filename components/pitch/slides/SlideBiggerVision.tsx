"use client";

import { Reveal, useStep } from "../Reveal";
import { AeviaArc } from "@/components/brand/AeviaArc";

const STAGES = [
  { key: "plan", label: "Plan", body: "Time" },
  { key: "context", label: "Context", body: "Work" },
  { key: "personal", label: "Personal intelligence", body: "World" },
  { key: "aevia", label: "Aevia ecosystem", body: "Life" },
];

export function SlideBiggerVision() {
  const step = useStep();
  return (
    <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col justify-center px-24 py-24">
      <div className="wordmark mb-6 text-[10px] text-fg-subtle">
        17 · The bigger vision
      </div>

      <div className="grid grid-cols-[1.1fr_1fr] gap-16">
        <div className="space-y-6">
          <Line
            visible
            faded={step >= 1}
            time="Today,"
            body="Aevia plans your time."
          />
          <Reveal at={1}>
            <Line
              visible
              faded={step >= 2}
              time="Tomorrow,"
              body="it understands your work."
            />
          </Reveal>
          <Reveal at={2}>
            <Line
              visible
              time="Eventually,"
              body="it understands your world."
              accent
            />
          </Reveal>
        </div>

        <div>
          <div className="wordmark text-[10px] text-fg-subtle">
            The progression
          </div>
          <div className="mt-6 space-y-3">
            {STAGES.map((s, i) => {
              const active = i <= step + 1;
              const isFinal = i === STAGES.length - 1 && step >= 2;
              return (
                <div
                  key={s.key}
                  className="flex items-center gap-4 rounded-[12px] border p-4 transition-all duration-500"
                  style={{
                    borderColor: isFinal
                      ? "var(--gold)"
                      : active
                        ? "var(--border-strong)"
                        : "var(--border)",
                    background: isFinal
                      ? "var(--gold-soft)"
                      : "var(--surface)",
                    opacity: active ? 1 : 0.4,
                  }}
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{
                      background: isFinal
                        ? "var(--gold)"
                        : active
                          ? "var(--surface-2)"
                          : "var(--surface)",
                      border: "1px solid var(--gold)",
                      color: isFinal ? "var(--bg)" : "var(--gold)",
                      fontVariantNumeric: "tabular-nums",
                      fontSize: 12,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="flex-1">
                    <div
                      className={`serif ${isFinal ? "text-gold" : "text-fg"}`}
                      style={{
                        fontSize: "20px",
                        lineHeight: "26px",
                        letterSpacing: "-0.01em",
                        fontStyle: isFinal ? "italic" : "normal",
                        fontWeight: 400,
                      }}
                    >
                      {s.label}
                    </div>
                    <div className="wordmark mt-1 text-[9px] text-fg-subtle">
                      {s.body}
                    </div>
                  </div>
                  {isFinal && <AeviaArc size={22} />}
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-fg-subtle text-[12px] italic">
            Directional vision. The MVP earns the right to build toward this.
          </p>
        </div>
      </div>
    </div>
  );
}

function Line({
  time,
  body,
  visible,
  faded = false,
  accent = false,
}: {
  time: string;
  body: string;
  visible: boolean;
  faded?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className="flex items-baseline gap-6 transition-opacity duration-700"
      style={{ opacity: visible ? (faded ? 0.35 : 1) : 0 }}
    >
      <span
        className="wordmark text-[11px] text-gold"
        style={{ minWidth: 120 }}
      >
        {time}
      </span>
      <span
        className={`serif ${accent ? "text-gold italic" : "text-fg"}`}
        style={{
          fontSize: accent ? "44px" : "40px",
          lineHeight: accent ? "52px" : "48px",
          letterSpacing: "-0.02em",
          fontWeight: 400,
        }}
      >
        {body}
      </span>
    </div>
  );
}
