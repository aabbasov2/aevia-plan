"use client";

import { AeviaArc } from "@/components/brand/AeviaArc";
import { useStep } from "../Reveal";

const KNOWN = [
  { key: "What", note: "You" },
  { key: "How long", note: "You" },
  { key: "By when", note: "You" },
];

export function SlideReveal() {
  const step = useStep();
  return (
    <div className="relative h-full w-full deck-radial">
      <div className="mx-auto flex h-full w-full max-w-[1200px] flex-col justify-center px-24 py-24">
        <div className="wordmark mb-12 text-[10px] text-fg-subtle">
          04 · The reveal
        </div>

        <div className="grid grid-cols-4 gap-6">
          {KNOWN.map((k, i) => (
            <div
              key={k.key}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6"
              style={{
                opacity: step >= 0 ? 1 : 0,
                transition: `opacity 600ms ease ${i * 120}ms`,
              }}
            >
              <div className="wordmark text-[10px] text-fg-subtle">
                {k.note}
              </div>
              <div
                className="serif mt-4 text-fg"
                style={{
                  fontSize: "36px",
                  lineHeight: "42px",
                  letterSpacing: "-0.02em",
                  fontWeight: 400,
                }}
              >
                {k.key}
              </div>
            </div>
          ))}

          <div
            className="relative rounded-[14px] p-6 transition-all duration-700"
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: step >= 1 ? "var(--gold)" : "var(--border)",
              background:
                step >= 1 ? "var(--gold-soft)" : "var(--surface)",
              opacity: step >= 1 ? 1 : 0.35,
              transform: step >= 1 ? "translateY(-4px)" : "none",
            }}
          >
            {step >= 1 && (
              <div
                className="pointer-events-none absolute -inset-1 rounded-[16px]"
                style={{
                  boxShadow: "0 0 0 1px var(--gold-soft)",
                }}
              />
            )}
            <div
              className="wordmark text-[10px]"
              style={{ color: step >= 1 ? "var(--gold)" : "var(--fg-subtle)" }}
            >
              Aevia
            </div>
            <div
              className="serif mt-4"
              style={{
                fontSize: "36px",
                lineHeight: "42px",
                letterSpacing: "-0.02em",
                fontWeight: 400,
                color: step >= 1 ? "var(--gold)" : "var(--fg)",
                fontStyle: step >= 1 ? "italic" : "normal",
              }}
            >
              When
            </div>
          </div>
        </div>

        <div className="mt-16 flex items-center gap-8">
          <div
            className="flex items-center gap-4"
            style={{
              opacity: step >= 2 ? 1 : 0,
              transform: step >= 2 ? "none" : "translateY(8px)",
              transition: "opacity 700ms ease, transform 700ms ease",
            }}
          >
            <AeviaArc size={32} pulse={step >= 2} />
            <div className="h-px w-16 bg-[var(--gold)]" />
            <h2
              className="serif text-fg"
              style={{
                fontSize: "44px",
                lineHeight: "52px",
                letterSpacing: "-0.02em",
                fontWeight: 400,
              }}
            >
              Aevia finds the{" "}
              <span className="italic text-gold">when.</span>
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}
