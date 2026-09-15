"use client";

const STEPS = ["Task", "Duration", "Deadline", "Capacity", "Schedule"];

export function SlideStartingNarrow() {
  return (
    <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col justify-center px-24 py-24">
      <div className="wordmark mb-6 text-[10px] text-fg-subtle">
        09 · Starting narrow
      </div>

      <h1
        className="serif text-fg"
        style={{
          fontSize: "56px",
          lineHeight: "62px",
          letterSpacing: "-0.02em",
          fontWeight: 400,
        }}
      >
        We&apos;re starting narrow{" "}
        <span className="italic text-fg-muted">on purpose.</span>
      </h1>

      <div className="mt-14 grid grid-cols-[1fr_1fr] gap-16">
        <div>
          <div className="wordmark text-[10px] text-fg-subtle">
            The MVP is
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Pillar title="Tasks" body="What needs to happen" />
            <Pillar
              title="Calendar"
              body="What time exists"
            />
            <Pillar
              title="Planning intelligence"
              body="Connects the two"
              accent
            />
          </div>
          <p className="mt-10 text-fg text-[17px] leading-8 max-w-[520px]">
            One problem, done exceptionally well:{" "}
            <span className="text-gold">
              turn a workload into a realistic plan.
            </span>
          </p>
        </div>

        <div>
          <div className="wordmark text-[10px] text-fg-subtle">
            The primitive
          </div>
          <div className="mt-5">
            <div className="flex items-center gap-2 flex-wrap">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <span
                    className="rounded-full border px-3.5 py-1.5"
                    style={{
                      borderColor:
                        i === STEPS.length - 1
                          ? "var(--gold)"
                          : "var(--border-strong)",
                      background:
                        i === STEPS.length - 1
                          ? "var(--gold-soft)"
                          : "var(--surface)",
                      color:
                        i === STEPS.length - 1 ? "var(--gold)" : "var(--fg)",
                      fontSize: "14px",
                    }}
                  >
                    {s}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className="text-fg-subtle text-[12px]">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 flex items-center gap-4">
            <div className="h-px w-12 bg-[var(--gold)]" />
            <p
              className="serif text-fg italic"
              style={{
                fontSize: "28px",
                lineHeight: "36px",
                letterSpacing: "-0.02em",
                fontWeight: 400,
              }}
            >
              Prove the engine first.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pillar({
  title,
  body,
  accent = false,
}: {
  title: string;
  body: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-[12px] border p-4 ${
        accent
          ? "border-[var(--gold)] bg-[var(--gold-soft)]"
          : "border-[var(--border)] bg-[var(--surface)]"
      }`}
    >
      <div
        className={`wordmark text-[10px] ${accent ? "text-gold" : "text-fg-subtle"}`}
      >
        {title}
      </div>
      <div className="mt-3 text-fg text-[14px] leading-5">{body}</div>
    </div>
  );
}
