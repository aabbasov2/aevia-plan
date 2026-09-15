"use client";

import { Reveal, useStep } from "../Reveal";

const SIMPLE = ["Tasks", "Calendar", "Plan Health"];
const COMPLEX = [
  "Scheduling",
  "Constraint solving",
  "Context retrieval",
  "Model orchestration",
  "AI cost control",
  "Personalization",
  "Integrations",
  "Reliability",
];

export function SlideCTOCase() {
  const step = useStep();
  return (
    <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col justify-center px-24 py-24">
      <div className="wordmark mb-6 text-[10px] text-fg-subtle">
        16 · For a founding CTO
      </div>

      <h1
        className="serif text-fg max-w-[1100px]"
        style={{
          fontSize: "48px",
          lineHeight: "54px",
          letterSpacing: "-0.02em",
          fontWeight: 400,
        }}
      >
        A simple product with a{" "}
        <span className="italic text-fg-muted">
          surprisingly deep technical problem.
        </span>
      </h1>

      <div className="mt-12 grid grid-cols-[1fr_auto_1.4fr] items-stretch gap-8">
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <span className="wordmark text-[10px] text-fg-subtle">
            The interface
          </span>
          <div className="mt-5 space-y-4">
            {SIMPLE.map((s) => (
              <div
                key={s}
                className="serif text-fg"
                style={{
                  fontSize: "28px",
                  lineHeight: "32px",
                  letterSpacing: "-0.01em",
                  fontWeight: 400,
                }}
              >
                {s}
              </div>
            ))}
          </div>
          <p className="serif mt-6 text-fg italic text-[16px] leading-6">
            The interface is simple.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center">
          <div className="h-16 w-px bg-[var(--gold)]" />
          <span
            className="wordmark my-3 text-[9px] text-gold"
            style={{ letterSpacing: "0.4em" }}
          >
            Beneath
          </span>
          <div className="h-16 w-px bg-[var(--gold)]" />
        </div>

        <div
          className="rounded-[14px] border p-6"
          style={{
            borderColor: step >= 1 ? "var(--gold)" : "var(--border)",
            background:
              step >= 1 ? "var(--gold-soft)" : "var(--surface)",
            transition:
              "background 700ms ease, border-color 700ms ease",
          }}
        >
          <span
            className="wordmark text-[10px]"
            style={{
              color: step >= 1 ? "var(--gold)" : "var(--fg-subtle)",
              transition: "color 700ms ease",
            }}
          >
            The system underneath
          </span>
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2">
            {COMPLEX.map((s) => (
              <div
                key={s}
                className="flex items-start gap-2 text-fg text-[14px] leading-6"
              >
                <span className="mt-2 h-1 w-1 rounded-full bg-[var(--gold)]" />
                {s}
              </div>
            ))}
          </div>
          <Reveal at={1}>
            <p className="serif mt-6 text-gold italic text-[18px] leading-7">
              The system underneath isn&apos;t.
            </p>
          </Reveal>
        </div>
      </div>

      <p className="mt-10 max-w-[900px] text-fg-muted text-[14px] leading-7">
        The CTO opportunity is to own the technical foundation from the
        beginning — planning engine, context model, AI orchestration, product
        infrastructure. The moat is not asserted. It is earned through
        execution.
      </p>
    </div>
  );
}
