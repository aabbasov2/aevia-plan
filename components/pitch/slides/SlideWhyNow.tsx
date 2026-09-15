"use client";

import { SlideFrame } from "../SlideFrame";

export function SlideWhyNow() {
  return (
    <SlideFrame label="14 · Why now">
      <h1
        className="serif text-fg max-w-[1000px]"
        style={{
          fontSize: "56px",
          lineHeight: "62px",
          letterSpacing: "-0.02em",
          fontWeight: 400,
        }}
      >
        The interface to software{" "}
        <span className="italic text-fg-muted">is changing.</span>
      </h1>

      <div className="mt-16 grid grid-cols-2 gap-10">
        <ModelCard
          label="Traditional software"
          rows={["User", "App", "Feature", "Action"]}
          muted
        />
        <ModelCard
          label="AI-native software"
          rows={[
            "User",
            "Intent",
            "System understands context",
            "System executes",
          ]}
          accent
        />
      </div>

      <p className="serif mt-16 max-w-[900px] text-fg text-[24px] leading-9 italic">
        The important point is not that AI is cool. The important point is that
        software can finally{" "}
        <span className="text-gold not-italic">
          understand intent
        </span>{" "}
        well enough to participate in planning.
      </p>

      <div className="mt-8 flex items-center gap-3">
        <span className="wordmark text-[10px] text-fg-subtle">Aevia</span>
        <div className="h-px w-24 bg-[var(--gold)]" />
        <span className="wordmark text-[10px] text-gold">
          is designed for the second model
        </span>
      </div>
    </SlideFrame>
  );
}

function ModelCard({
  label,
  rows,
  accent = false,
  muted = false,
}: {
  label: string;
  rows: string[];
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-[14px] p-8 ${
        accent
          ? "border border-[var(--gold)] bg-[var(--gold-soft)]"
          : "border border-[var(--border)] bg-[var(--surface)]"
      }`}
    >
      <span
        className={`wordmark text-[10px] ${accent ? "text-gold" : "text-fg-subtle"}`}
      >
        {label}
      </span>
      <div className="mt-6 space-y-4">
        {rows.map((r, i) => (
          <div key={r}>
            <div
              className={`serif ${muted ? "text-fg-muted" : "text-fg"}`}
              style={{
                fontSize: "26px",
                lineHeight: "30px",
                letterSpacing: "-0.01em",
                fontStyle: accent && i > 0 ? "italic" : "normal",
                fontWeight: 400,
              }}
            >
              {r}
            </div>
            {i < rows.length - 1 && (
              <div className="mt-3 text-fg-subtle text-[12px]">↓</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
