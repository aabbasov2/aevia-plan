"use client";

const QUESTIONS = [
  "Do people trust Aevia to plan their work?",
  "Does automatic scheduling save meaningful effort?",
  "Do users return because the plan stays useful?",
  "Does Plan Health change behavior?",
  "Do users pay for deeper planning?",
];

export function SlideProve() {
  return (
    <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col justify-center px-24 py-24">
      <div className="wordmark mb-6 text-[10px] text-fg-subtle">
        18 · What we prove
      </div>

      <h1
        className="serif text-fg max-w-[1000px]"
        style={{
          fontSize: "52px",
          lineHeight: "58px",
          letterSpacing: "-0.02em",
          fontWeight: 400,
        }}
      >
        We don&apos;t need to prove everything.
        <br />
        <span className="italic text-gold">
          We need to prove the next thing.
        </span>
      </h1>

      <div className="mt-12">
        <div className="wordmark text-[10px] text-fg-subtle">
          MVP validation
        </div>
        <div className="mt-5 space-y-2">
          {QUESTIONS.map((q, i) => (
            <div
              key={q}
              className="flex items-center gap-6 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4"
            >
              <span
                className="wordmark text-[11px] text-gold"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                Q{i + 1}
              </span>
              <span
                className="serif text-fg"
                style={{
                  fontSize: "22px",
                  lineHeight: "30px",
                  letterSpacing: "-0.01em",
                  fontWeight: 400,
                }}
              >
                {q}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="serif mt-10 max-w-[900px] text-fg-muted italic text-[18px] leading-8">
        A disciplined MVP focuses execution on evidence — not on speculation.
      </p>
    </div>
  );
}
