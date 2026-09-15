"use client";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    line: "Personal planning.",
    features: ["Tasks", "Calendar", "Basic planning", "Plan Health", "Luna"],
  },
  {
    name: "Paid",
    price: "€9.99",
    priceSuffix: "/mo",
    priceNote: "working hypothesis",
    line: "Advanced planning.",
    features: [
      "Deeper AI",
      "Projects",
      "Richer context",
      "Automatic rescheduling",
      "More integrations",
      "Higher AI usage",
    ],
    accent: true,
  },
  {
    name: "Business",
    price: "Per seat",
    line: "Team planning.",
    features: [
      "Assignments",
      "Shared projects",
      "Team capacity",
      "Admin / enterprise",
    ],
  },
];

export function SlideBusinessModel() {
  return (
    <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col justify-center px-24 py-24">
      <div className="wordmark mb-6 text-[10px] text-fg-subtle">
        13 · Business model
      </div>

      <h1
        className="serif text-fg"
        style={{
          fontSize: "44px",
          lineHeight: "52px",
          letterSpacing: "-0.02em",
          fontWeight: 400,
        }}
      >
        Free creates adoption.
        <br />
        Paid creates depth.
        <br />
        <span className="italic text-fg-muted">
          Teams create expansion.
        </span>
      </h1>

      <div className="mt-12 grid grid-cols-3 gap-4">
        {TIERS.map((t) => (
          <div
            key={t.name}
            className={`rounded-[14px] p-6 ${
              t.accent
                ? "border border-[var(--gold)] bg-[var(--gold-soft)]"
                : "border border-[var(--border)] bg-[var(--surface)]"
            }`}
          >
            <div className="flex items-baseline justify-between">
              <span
                className={`wordmark text-[10px] ${t.accent ? "text-gold" : "text-fg-subtle"}`}
              >
                {t.name}
              </span>
              {t.accent && (
                <span className="wordmark text-[9px] text-gold">
                  Hypothesis
                </span>
              )}
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span
                className="serif text-fg"
                style={{
                  fontSize: "44px",
                  lineHeight: "48px",
                  letterSpacing: "-0.02em",
                  fontWeight: 400,
                }}
              >
                {t.price}
              </span>
              {t.priceSuffix && (
                <span className="text-fg-muted text-[14px]">
                  {t.priceSuffix}
                </span>
              )}
            </div>
            {t.priceNote && (
              <div className="mt-1 text-fg-subtle text-[10px] italic">
                {t.priceNote}
              </div>
            )}
            <p className="mt-4 text-fg-muted text-[13px] leading-6">
              {t.line}
            </p>
            <div className="my-5 divider" />
            <ul className="space-y-2">
              {t.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-fg text-[13px] leading-6"
                >
                  <span className="mt-2 h-1 w-1 rounded-full bg-[var(--gold)]" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-6 text-fg-subtle text-[12px] italic">
        Pricing is a working hypothesis, to be tested with early users. Not
        validated pricing.
      </p>
    </div>
  );
}
