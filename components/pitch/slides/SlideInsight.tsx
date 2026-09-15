"use client";

import { Reveal, useStep } from "../Reveal";

export function SlideInsight() {
  const step = useStep();
  return (
    <div className="relative h-full w-full">
      <div className="mx-auto flex h-full w-full max-w-[1200px] flex-col justify-center px-24 py-24">
        <div className="wordmark mb-10 text-[10px] text-fg-subtle">
          03 · The insight
        </div>

        <h1
          className="serif text-fg"
          style={{
            fontSize: "72px",
            lineHeight: "80px",
            letterSpacing: "-0.03em",
            fontWeight: 400,
            opacity: step >= 2 ? 0.35 : 1,
            transition: "opacity 700ms ease",
          }}
        >
          A task isn&apos;t a checkbox.
        </h1>

        <Reveal at={1}>
          <h2
            className="serif mt-4 text-fg-muted"
            style={{
              fontSize: "56px",
              lineHeight: "64px",
              letterSpacing: "-0.02em",
              fontStyle: "italic",
              fontWeight: 300,
              opacity: step >= 2 ? 0.7 : 1,
              transition: "opacity 700ms ease",
            }}
          >
            It&apos;s a commitment of time.
          </h2>
        </Reveal>

        <Reveal at={2}>
          <div className="mt-16">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-4">
              <Term text="What" />
              <Op char="+" />
              <Term text="How long" />
              <Op char="+" />
              <Term text="By when" />
              <Op char="+" />
              <Term text="Available time" />
            </div>
            <div className="mt-8 flex items-center gap-6">
              <div className="h-px w-12 bg-[var(--gold)]" />
              <span className="wordmark text-[10px] text-gold">Equals</span>
              <div
                className="serif text-fg"
                style={{
                  fontSize: "60px",
                  lineHeight: "64px",
                  letterSpacing: "-0.03em",
                  fontStyle: "italic",
                  fontWeight: 400,
                }}
              >
                a plan.
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function Term({ text }: { text: string }) {
  return (
    <span
      className="serif text-fg"
      style={{
        fontSize: "34px",
        lineHeight: "40px",
        letterSpacing: "-0.02em",
        fontWeight: 400,
      }}
    >
      {text}
    </span>
  );
}

function Op({ char }: { char: string }) {
  return <span className="text-fg-subtle text-[24px] leading-6">{char}</span>;
}
