"use client";

import { SlideFrame } from "../SlideFrame";

const PHASES = [
  {
    stage: "Now",
    title: "MVP",
    items: [
      "Tasks",
      "Weekly calendar",
      "Plan Health",
      "Mock intelligence",
    ],
  },
  {
    stage: "V1",
    title: "Real intelligence",
    items: [
      "Real planning engine",
      "Luna",
      "Structured AI planning",
    ],
  },
  {
    stage: "V2",
    title: "Context expansion",
    items: [
      "Google Calendar",
      "Projects",
      "Recurring planning",
      "Richer context",
    ],
  },
  {
    stage: "V3",
    title: "Teams",
    items: ["Assignments", "Shared projects", "Team capacity"],
  },
  {
    stage: "Long term",
    title: "Ecosystem",
    items: [
      "Mail",
      "Calendar",
      "Notes",
      "Tasks",
      "Files",
      "Personal AI",
      "Eventually hardware",
    ],
    accent: true,
  },
];

export function SlideRoadmap() {
  return (
    <SlideFrame label="15 · Roadmap">
      <h1
        className="serif text-fg max-w-[900px]"
        style={{
          fontSize: "52px",
          lineHeight: "58px",
          letterSpacing: "-0.02em",
          fontWeight: 400,
        }}
      >
        Start narrow.
        <br />
        <span className="italic text-fg-muted">
          Earn the right to expand.
        </span>
      </h1>

      <div className="mt-14">
        <div className="relative">
          <div className="pointer-events-none absolute left-0 right-0 top-6 h-px bg-[var(--border-strong)]" />
          <div className="grid grid-cols-5 gap-4">
            {PHASES.map((p, i) => (
              <div key={p.stage} className="relative">
                <div
                  className={`relative z-10 h-3 w-3 rounded-full ${
                    p.accent
                      ? "bg-[var(--gold)]"
                      : "bg-[var(--surface)] border border-[var(--gold)]"
                  }`}
                  style={{ marginLeft: 20, marginTop: 18 }}
                />
                <div
                  className={`mt-6 rounded-[12px] p-4 ${
                    p.accent
                      ? "border border-[var(--gold)] bg-[var(--gold-soft)]"
                      : "border border-[var(--border)] bg-[var(--surface)]"
                  }`}
                >
                  <span
                    className={`wordmark text-[10px] ${p.accent ? "text-gold" : "text-fg-subtle"}`}
                  >
                    {p.stage}
                  </span>
                  <div
                    className="serif mt-2 text-fg"
                    style={{
                      fontSize: "22px",
                      lineHeight: "26px",
                      letterSpacing: "-0.01em",
                      fontWeight: 400,
                    }}
                  >
                    {p.title}
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {p.items.map((it) => (
                      <li
                        key={it}
                        className="flex items-start gap-2 text-fg text-[12px] leading-5"
                      >
                        <span className="mt-2 h-1 w-1 rounded-full bg-[var(--fg-subtle)]" />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-8 max-w-[700px] text-fg-subtle text-[12px] italic">
        Directional roadmap, not committed delivery dates. Sequencing over
        promises.
      </p>
    </SlideFrame>
  );
}
