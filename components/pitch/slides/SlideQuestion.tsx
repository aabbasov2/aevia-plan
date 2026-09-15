"use client";

import { AeviaArc } from "@/components/brand/AeviaArc";
import { Reveal, useStep } from "../Reveal";

export function SlideQuestion() {
  const step = useStep();
  return (
    <div className="relative h-full w-full deck-radial">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full max-w-[1180px] px-24">
          <h1
            className="serif text-fg"
            style={{
              fontSize: "80px",
              lineHeight: "88px",
              letterSpacing: "-0.03em",
              fontWeight: 400,
              opacity: step >= 3 ? 0.35 : 1,
              transition: "opacity 700ms ease",
            }}
          >
            When are you actually going to{" "}
            <span className="italic text-fg-muted">get it done?</span>
          </h1>

          <div className="mt-14 space-y-6">
            <Reveal at={1}>
              <div className="flex items-baseline gap-6">
                <span className="wordmark text-[10px] text-fg-subtle">01</span>
                <p
                  className="serif text-fg-muted"
                  style={{
                    fontSize: "26px",
                    lineHeight: "34px",
                    letterSpacing: "-0.01em",
                    fontStyle: "italic",
                    fontWeight: 300,
                  }}
                >
                  Not when you add it to a task list.
                </p>
              </div>
            </Reveal>

            <Reveal at={2}>
              <div className="flex items-baseline gap-6">
                <span className="wordmark text-[10px] text-fg-subtle">02</span>
                <p
                  className="serif text-fg-muted"
                  style={{
                    fontSize: "26px",
                    lineHeight: "34px",
                    letterSpacing: "-0.01em",
                    fontStyle: "italic",
                    fontWeight: 300,
                  }}
                >
                  Not when you put it on a calendar.
                </p>
              </div>
            </Reveal>

            <Reveal at={3}>
              <div className="flex items-baseline gap-6">
                <span className="wordmark text-[10px] text-gold">03</span>
                <p
                  className="serif text-fg"
                  style={{
                    fontSize: "40px",
                    lineHeight: "48px",
                    letterSpacing: "-0.02em",
                    fontWeight: 400,
                  }}
                >
                  Actually get it done.
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal at={3} delay={400}>
            <div className="mt-16 flex items-center gap-4">
              <div className="h-px w-16 bg-[var(--gold)] gold-line" />
              <AeviaArc size={28} pulse />
              <span className="wordmark text-[11px] text-fg">
                AEVIA · PLAN
              </span>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
