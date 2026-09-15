"use client";

const TIERS = [
  {
    tier: "Free",
    model: "Luna",
    body: "High-volume, cost-efficient intelligence.",
    intensity: 1,
  },
  {
    tier: "Paid",
    model: "Luna + deeper reasoning",
    body: "Escalates only when the situation justifies it.",
    intensity: 2,
  },
  {
    tier: "Advanced",
    model: "Reserved capability",
    body: "Expensive reasoning for genuinely complex situations.",
    intensity: 3,
  },
];

const RULES = [
  "Deterministic logic first",
  "Small context windows",
  "Relevant-context retrieval",
  "Cached repeated context",
  "AI only when intelligence adds value",
];

export function SlideAIEconomics() {
  return (
    <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col justify-center px-24 py-24">
      <div className="wordmark mb-6 text-[10px] text-fg-subtle">
        12 · AI economics
      </div>

      <div className="grid grid-cols-[1fr_1.3fr] gap-16">
        <div>
          <h1
            className="serif text-fg"
            style={{
              fontSize: "48px",
              lineHeight: "54px",
              letterSpacing: "-0.02em",
              fontWeight: 400,
            }}
          >
            AI is a COGS line.
          </h1>
          <p className="mt-4 serif text-fg-muted italic text-[22px] leading-8 max-w-[440px]">
            We are not building a business around the assumption that AI gets
            cheaper.
          </p>

          <div className="mt-10">
            <div className="wordmark text-[10px] text-fg-subtle">
              Architecture
            </div>
            <ul className="mt-4 space-y-2">
              {RULES.map((r) => (
                <li
                  key={r}
                  className="flex items-start gap-3 text-fg text-[13px] leading-6"
                >
                  <span className="mt-2 h-1 w-1 rounded-full bg-[var(--gold)]" />
                  {r}
                </li>
              ))}
            </ul>
          </div>

          <p className="serif mt-8 max-w-[440px] text-fg italic text-[18px] leading-7">
            The business needs to work at today&apos;s inference economics.
          </p>
        </div>

        <div>
          <div className="wordmark text-[10px] text-fg-subtle">
            Intelligence routing
          </div>
          <div className="mt-4 space-y-3">
            {TIERS.map((t) => (
              <div
                key={t.tier}
                className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-4">
                    <span className="wordmark text-[10px] text-fg-subtle">
                      {t.tier}
                    </span>
                    <span
                      className="serif text-fg italic"
                      style={{
                        fontSize: "22px",
                        lineHeight: "28px",
                        letterSpacing: "-0.01em",
                        fontWeight: 400,
                      }}
                    >
                      {t.model}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((n) => (
                      <span
                        key={n}
                        className="h-2 w-2 rounded-full"
                        style={{
                          background:
                            n <= t.intensity
                              ? "var(--gold)"
                              : "var(--border-strong)",
                        }}
                      />
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-fg-muted text-[13px] leading-6">
                  {t.body}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-fg-subtle text-[11px] italic">
            No fabricated margins — the product has not launched.
          </p>
        </div>
      </div>
    </div>
  );
}
