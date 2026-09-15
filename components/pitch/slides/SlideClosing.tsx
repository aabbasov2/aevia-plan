"use client";

import { AeviaArc } from "@/components/brand/AeviaArc";
import { Reveal, useStep } from "../Reveal";

export function SlideClosing() {
  const step = useStep();
  return (
    <div className="relative h-full w-full deck-radial">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex w-full max-w-[1000px] flex-col items-center px-24 text-center">
          <AeviaArc size={56} pulse />
          <div className="mt-8 flex flex-col items-center leading-none">
            <span className="wordmark text-[16px] text-fg">AEVIA</span>
            <span
              className="wordmark mt-2 text-[10px] text-fg-subtle"
              style={{ letterSpacing: "0.4em" }}
            >
              PLAN
            </span>
          </div>

          <div className="mt-14 space-y-4">
            <h1
              className="serif text-fg transition-opacity duration-700"
              style={{
                fontSize: "68px",
                lineHeight: "74px",
                letterSpacing: "-0.03em",
                fontWeight: 400,
                opacity: step >= 2 ? 0.4 : 1,
              }}
            >
              Everything gets done.
            </h1>
            <Reveal at={1}>
              <h2
                className="serif text-fg-muted transition-opacity duration-700"
                style={{
                  fontSize: "56px",
                  lineHeight: "64px",
                  letterSpacing: "-0.03em",
                  fontStyle: "italic",
                  fontWeight: 300,
                  opacity: step >= 2 ? 0.4 : 1,
                }}
              >
                It&apos;s a matter of when.
              </h2>
            </Reveal>
          </div>

          <Reveal at={2}>
            <div className="mt-14 flex flex-col items-center gap-3">
              <div className="flex items-center gap-4">
                <div className="h-px w-16 bg-[var(--gold)]" />
                <h2
                  className="serif text-fg"
                  style={{
                    fontSize: "48px",
                    lineHeight: "56px",
                    letterSpacing: "-0.02em",
                    fontWeight: 400,
                  }}
                >
                  You tell Aevia <span className="italic">what.</span>
                </h2>
                <div className="h-px w-16 bg-[var(--gold)]" />
              </div>
              <Reveal at={3}>
                <h2
                  className="serif text-gold italic"
                  style={{
                    fontSize: "48px",
                    lineHeight: "56px",
                    letterSpacing: "-0.02em",
                    fontWeight: 400,
                  }}
                >
                  Aevia finds the when.
                </h2>
              </Reveal>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
