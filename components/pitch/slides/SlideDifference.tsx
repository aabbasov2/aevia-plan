"use client";

import { Reveal, useStep } from "../Reveal";

const ROWS = [
  { name: "Task manager", asks: "What needs to happen?" },
  { name: "Calendar", asks: "What is happening when?" },
  { name: "AI assistant", asks: "What should I do?" },
];

export function SlideDifference() {
  const step = useStep();
  return (
    <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col justify-center px-24 py-24">
      <div className="wordmark mb-6 text-[10px] text-fg-subtle">
        08 · The difference
      </div>

      <h1
        className="serif text-fg max-w-[1100px]"
        style={{
          fontSize: "48px",
          lineHeight: "56px",
          letterSpacing: "-0.02em",
          fontWeight: 400,
        }}
      >
        This is the difference between{" "}
        <span className="italic text-fg-muted">managing work</span> and{" "}
        <span className="italic text-fg-muted">managing time.</span>
      </h1>

      <div className="mt-12 grid grid-cols-2 gap-16">
        <div className="space-y-3">
          {ROWS.map((r, i) => (
            <div
              key={r.name}
              className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4 transition-opacity duration-500"
              style={{ opacity: step >= 0 ? 1 : 0 }}
            >
              <div className="flex items-baseline justify-between">
                <span className="wordmark text-[10px] text-fg-subtle">
                  {r.name}
                </span>
                <span
                  className="wordmark text-[9px] text-fg-subtle"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  0{i + 1}
                </span>
              </div>
              <div
                className="serif mt-3 text-fg italic"
                style={{
                  fontSize: "20px",
                  lineHeight: "28px",
                  letterSpacing: "-0.01em",
                  fontWeight: 400,
                }}
              >
                &ldquo;{r.asks}&rdquo;
              </div>
            </div>
          ))}
        </div>

        <div>
          <Reveal at={1}>
            <div className="rounded-[14px] border border-[var(--gold)] bg-[var(--gold-soft)] p-6">
              <div className="flex items-baseline justify-between">
                <span className="wordmark text-[10px] text-gold">Aevia</span>
                <span className="wordmark text-[9px] text-gold">04</span>
              </div>
              <div
                className="serif mt-4 text-fg italic"
                style={{
                  fontSize: "26px",
                  lineHeight: "36px",
                  letterSpacing: "-0.02em",
                  fontWeight: 400,
                }}
              >
                &ldquo;What needs to happen,{" "}
                <br />
                and when can it realistically happen?&rdquo;
              </div>
            </div>
          </Reveal>

          <Reveal at={2}>
            <div className="mt-10 space-y-2">
              <div className="flex items-center gap-4">
                <div className="h-px w-8 bg-[var(--gold)]" />
                <h2
                  className="serif text-fg"
                  style={{
                    fontSize: "38px",
                    lineHeight: "46px",
                    letterSpacing: "-0.02em",
                    fontWeight: 400,
                  }}
                >
                  You tell Aevia <span className="italic">what.</span>
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-px w-8 bg-[var(--gold)]" />
                <h2
                  className="serif text-gold"
                  style={{
                    fontSize: "38px",
                    lineHeight: "46px",
                    letterSpacing: "-0.02em",
                    fontStyle: "italic",
                    fontWeight: 400,
                  }}
                >
                  Aevia finds the when.
                </h2>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
