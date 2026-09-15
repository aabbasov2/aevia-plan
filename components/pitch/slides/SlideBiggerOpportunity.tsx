"use client";

const LAYERS = [
  "Tasks",
  "Calendar",
  "Projects",
  "Email",
  "Notes",
  "Files",
  "Personal context",
  "Aevia intelligence",
];

const EXAMPLES = [
  { from: "Email mentions a deadline", to: "Task" },
  { from: "Meeting changes", to: "Plan changes" },
  { from: "Note contains a commitment", to: "Task" },
  { from: "Project has unfinished work", to: "Schedule" },
];

export function SlideBiggerOpportunity() {
  return (
    <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col justify-center px-24 py-24">
      <div className="wordmark mb-6 text-[10px] text-fg-subtle">
        10 · The bigger opportunity
      </div>

      <h1
        className="serif text-fg max-w-[1000px]"
        style={{
          fontSize: "52px",
          lineHeight: "60px",
          letterSpacing: "-0.02em",
          fontWeight: 400,
        }}
      >
        The planner becomes{" "}
        <span className="italic text-fg-muted">
          the context layer.
        </span>
      </h1>

      <div className="mt-12 grid grid-cols-[1fr_1.2fr] gap-16">
        <div>
          <div className="wordmark text-[10px] text-fg-subtle">
            Expansion
          </div>
          <div className="mt-5 space-y-1.5">
            {LAYERS.map((l, i) => {
              const intensity = i / (LAYERS.length - 1);
              const isLast = i === LAYERS.length - 1;
              return (
                <div key={l} className="flex items-center gap-4">
                  <div
                    className="h-px"
                    style={{
                      width: 40 + intensity * 120,
                      background: `color-mix(in oklab, var(--gold) ${20 + intensity * 70}%, transparent)`,
                    }}
                  />
                  <span
                    className="serif"
                    style={{
                      fontSize: 16 + intensity * 14,
                      lineHeight: `${26 + intensity * 8}px`,
                      letterSpacing: "-0.01em",
                      fontStyle: isLast ? "italic" : "normal",
                      color: isLast ? "var(--gold)" : "var(--fg)",
                    }}
                  >
                    {l}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col justify-center gap-8">
          <p className="text-fg text-[16px] leading-8 max-w-[540px]">
            Today Aevia understands what you need to do and when you have time.
            As more context connects, Aevia can understand more of the world
            around the work.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {EXAMPLES.map((e) => (
              <div
                key={e.from}
                className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <div className="text-fg-muted text-[12px]">{e.from}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-gold text-[13px]">→</span>
                  <div className="text-fg text-[15px]">{e.to}</div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-fg-subtle text-[12px] italic max-w-[540px]">
            This is the expansion path — not something built today.
          </p>
        </div>
      </div>
    </div>
  );
}
