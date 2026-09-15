"use client";

import { Reveal, useStep } from "../Reveal";
import { AeviaArc } from "@/components/brand/AeviaArc";
import { Check } from "lucide-react";

export function SlideWorldToday() {
  const step = useStep();
  return (
    <div className="relative h-full w-full deck-radial">
      <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col justify-center px-24 py-24">
        <div className="wordmark mb-8 text-[10px] text-fg-subtle">
          02 · The world today
        </div>

        <div className="grid grid-cols-3 gap-6">
          <Panel
            active={step >= 0}
            label="We have task managers."
            visual={<TaskListVisual />}
          />
          <Panel
            active={step >= 1}
            label="We have calendars."
            visual={<CalendarVisual />}
          />
          <Panel
            active={step >= 2}
            label="We have AI assistants."
            visual={<AIVisual />}
          />
        </div>

        <div className="mt-16 flex items-baseline gap-6">
          <div
            className="h-px flex-1 transition-colors duration-500"
            style={{
              background: step >= 3 ? "var(--gold)" : "var(--border-strong)",
            }}
          />
          <h1
            className="serif text-fg text-center"
            style={{
              fontSize: "44px",
              lineHeight: "52px",
              letterSpacing: "-0.02em",
              fontWeight: 400,
              opacity: step >= 3 ? 1 : 0.15,
              transition: "opacity 700ms ease",
            }}
          >
            But we still do the{" "}
            <span className="italic text-gold">planning.</span>
          </h1>
          <div
            className="h-px flex-1 transition-colors duration-500"
            style={{
              background: step >= 3 ? "var(--gold)" : "var(--border-strong)",
            }}
          />
        </div>

        <Reveal at={3}>
          <p className="mt-6 mx-auto max-w-[720px] text-center text-fg-muted text-[15px] leading-7">
            The user is still responsible for connecting{" "}
            <span className="text-fg">work</span> and{" "}
            <span className="text-fg">time</span>.
          </p>
        </Reveal>
      </div>
    </div>
  );
}

function Panel({
  active,
  label,
  visual,
}: {
  active: boolean;
  label: string;
  visual: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[14px] border p-5 transition-all duration-500"
      style={{
        borderColor: active ? "var(--border-strong)" : "var(--border)",
        background: active ? "var(--surface)" : "var(--surface)/60",
        opacity: active ? 1 : 0.35,
        transform: active ? "none" : "translateY(6px)",
      }}
    >
      <div className="wordmark text-[10px] text-fg-subtle">Today</div>
      <div
        className="serif mt-2 text-fg"
        style={{
          fontSize: "22px",
          lineHeight: "28px",
          letterSpacing: "-0.01em",
          fontWeight: 400,
        }}
      >
        {label}
      </div>
      <div className="mt-5">{visual}</div>
    </div>
  );
}

function TaskListVisual() {
  const items = [
    { text: "Send status report", done: true },
    { text: "Sustainability project", done: false },
    { text: "Book flights", done: false },
    { text: "Thesis outline", done: false },
    { text: "Refactor onboarding", done: false },
  ];
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
        >
          <span
            className="flex h-4 w-4 items-center justify-center rounded-[4px] border"
            style={{
              borderColor: it.done ? "var(--gold)" : "var(--border-strong)",
              background: it.done ? "var(--gold-soft)" : "transparent",
            }}
          >
            {it.done && <Check size={10} style={{ color: "var(--gold)" }} />}
          </span>
          <span
            className={`text-[13px] ${it.done ? "text-fg-subtle line-through" : "text-fg"}`}
          >
            {it.text}
          </span>
        </div>
      ))}
    </div>
  );
}

function CalendarVisual() {
  const DAYS = ["M", "T", "W", "T", "F"];
  const BLOCKS = [
    { d: 0, top: 6, h: 28, c: "var(--block-4)" },
    { d: 1, top: 44, h: 32, c: "var(--block-2)" },
    { d: 2, top: 20, h: 46, c: "var(--block-5)" },
    { d: 3, top: 70, h: 30, c: "var(--block-4)" },
    { d: 4, top: 16, h: 64, c: "var(--block-5)" },
  ];
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {DAYS.map((d, i) => (
        <div key={i}>
          <div className="mb-1.5 text-center text-fg-subtle text-[9px] uppercase tracking-wider">
            {d}
          </div>
          <div className="relative h-[140px] rounded-[6px] border border-[var(--border)] bg-[var(--surface-2)]/70">
            {BLOCKS.filter((b) => b.d === i).map((b, idx) => (
              <div
                key={idx}
                className="absolute inset-x-1 rounded-[3px]"
                style={{
                  top: b.top,
                  height: b.h,
                  background: b.c,
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AIVisual() {
  return (
    <div className="flex h-full min-h-[164px] flex-col items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-5">
      <AeviaArc size={44} pulse />
      <div className="mt-5 h-px w-16 bg-[var(--gold)]/50" />
      <div className="mt-3 space-y-1.5 text-center">
        <div className="text-fg-muted text-[11px]">
          &ldquo;Book that for tomorrow&rdquo;
        </div>
        <div className="text-fg-muted text-[11px]">
          &ldquo;Draft me an email&rdquo;
        </div>
        <div className="text-fg-muted text-[11px]">
          &ldquo;Summarize this&rdquo;
        </div>
      </div>
    </div>
  );
}
