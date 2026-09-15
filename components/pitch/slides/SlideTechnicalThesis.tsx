"use client";

import { Reveal, useStep } from "../Reveal";

const LAYERS = [
  { label: "User intent", items: ["Ask · Command · Update"] },
  {
    label: "Context",
    items: ["Tasks", "Deadlines", "Calendar", "Availability", "Preferences"],
  },
  {
    label: "Planning engine",
    items: ["Capacity", "Scheduling", "Dependencies", "Recurrence"],
    accent: true,
  },
  {
    label: "AI intelligence",
    items: ["Decomposition", "Ambiguity", "Reasoning", "Explanations"],
  },
  {
    label: "Integrations",
    items: ["Calendar", "Email", "Files", "Future ecosystem"],
  },
];

export function SlideTechnicalThesis() {
  const step = useStep();
  return (
    <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col justify-center px-24 py-24">
      <div className="wordmark mb-6 text-[10px] text-fg-subtle">
        11 · Technical thesis
      </div>

      <div className="grid grid-cols-[1fr_1.4fr] gap-16">
        <div>
          <h1
            className="serif text-fg"
            style={{
              fontSize: "48px",
              lineHeight: "54px",
              letterSpacing: "-0.02em",
              fontWeight: 400,
              opacity: step >= 1 ? 0.35 : 1,
              transition: "opacity 700ms ease",
            }}
          >
            The moat isn&apos;t the model.
          </h1>
          <Reveal at={1}>
            <h2
              className="serif mt-4 text-gold italic"
              style={{
                fontSize: "40px",
                lineHeight: "48px",
                letterSpacing: "-0.02em",
                fontWeight: 400,
              }}
            >
              It&apos;s the planning system around it.
            </h2>
          </Reveal>
          <p className="mt-8 text-fg-muted text-[15px] leading-7 max-w-[440px]">
            LLMs are replaceable. The product logic — planning engine, context
            model, scheduling behavior, user data structure, product experience
            — should not be.
          </p>
          <p className="mt-6 text-fg-subtle text-[12px] italic max-w-[440px]">
            The message is not &ldquo;we already have a moat.&rdquo; It is
            &ldquo;this is where we intend to build one.&rdquo;
          </p>
        </div>

        <div className="space-y-3">
          {LAYERS.map((l, i) => (
            <div key={l.label} className="relative">
              {i > 0 && (
                <div className="pointer-events-none absolute left-1/2 -top-[9px] flex -translate-x-1/2 items-center">
                  <span className="text-gold text-[11px]">↓</span>
                </div>
              )}
              <div
                className={`rounded-[12px] px-5 py-4 ${
                  l.accent
                    ? "border border-[var(--gold)] bg-[var(--gold-soft)]"
                    : "border border-[var(--border)] bg-[var(--surface)]"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <span
                    className={`wordmark text-[10px] ${l.accent ? "text-gold" : "text-fg-subtle"}`}
                  >
                    {l.label}
                  </span>
                  <span
                    className="wordmark text-[9px] text-fg-subtle"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {l.items.map((it) => (
                    <span
                      key={it}
                      className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-fg text-[12px]"
                    >
                      {it}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
