"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SLIDES } from "./slides";
import { AeviaArc } from "@/components/brand/AeviaArc";
import { StepProvider } from "./Reveal";

export function Deck() {
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [showOverview, setShowOverview] = useState(false);

  const total = SLIDES.length;
  const current = SLIDES[index];
  const currentSteps = current.steps ?? 1;

  const goToSlide = useCallback(
    (n: number, atStep: number = 0) => {
      setIndex(() => {
        const next = Math.max(0, Math.min(total - 1, n));
        return next;
      });
      setStep(atStep);
    },
    [total]
  );

  const next = useCallback(() => {
    if (step < currentSteps - 1) {
      setStep(step + 1);
      return;
    }
    if (index < total - 1) {
      setIndex(index + 1);
      setStep(0);
    }
  }, [step, currentSteps, index, total]);

  const prev = useCallback(() => {
    if (step > 0) {
      setStep(step - 1);
      return;
    }
    if (index > 0) {
      const prevIdx = index - 1;
      const prevSteps = SLIDES[prevIdx].steps ?? 1;
      setIndex(prevIdx);
      setStep(prevSteps - 1);
    }
  }, [step, index]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (showOverview) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowOverview(false);
        }
        return;
      }
      if (
        e.key === "ArrowRight" ||
        e.key === "PageDown" ||
        e.key === " " ||
        e.key === "Enter"
      ) {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        goToSlide(index + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        goToSlide(index - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goToSlide(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goToSlide(total - 1, (SLIDES[total - 1].steps ?? 1) - 1);
      } else if (e.key === "Escape") {
        setShowOverview((v) => !v);
      } else if (/^[0-9]$/.test(e.key)) {
        const n = Number(e.key);
        if (n === 0) goToSlide(9);
        else goToSlide(n - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, goToSlide, total, index, showOverview]);

  const Slide = current.Component;
  const percent = useMemo(() => ((index + 1) / total) * 100, [index, total]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[var(--bg)] text-fg">
      <div key={current.id} className="absolute inset-0 slide-in">
        <StepProvider step={step}>
          <Slide />
        </StepProvider>
      </div>

      {/* Top chrome */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center justify-between px-10 py-6">
        <div className="flex items-center gap-3">
          <AeviaArc size={20} />
          <div className="flex flex-col leading-none">
            <span className="wordmark text-[11px] text-fg">AEVIA</span>
            <span
              className="wordmark mt-1 text-[8px] text-fg-subtle"
              style={{ letterSpacing: "0.32em" }}
            >
              PLAN
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {currentSteps > 1 && (
            <div className="flex items-center gap-1.5">
              {Array.from({ length: currentSteps }).map((_, i) => (
                <span
                  key={i}
                  className="h-1 w-1 rounded-full transition-all duration-300"
                  style={{
                    background:
                      i <= step ? "var(--gold)" : "var(--border-strong)",
                    transform: i === step ? "scale(1.6)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          )}
          <div className="wordmark text-[10px] text-fg-subtle">
            {current.title}
          </div>
        </div>
      </div>

      {/* Bottom chrome */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 px-10 pb-6">
        <div className="flex items-end justify-between">
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              onClick={prev}
              disabled={index === 0 && step === 0}
              aria-label="Previous"
              className="btn btn-ghost h-9 w-9 p-0 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={next}
              disabled={index === total - 1 && step === currentSteps - 1}
              aria-label="Next"
              className="btn btn-ghost h-9 w-9 p-0 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setShowOverview((v) => !v)}
              className="btn btn-ghost h-9 px-3 text-[11px]"
              aria-label="Overview"
            >
              <span className="wordmark">Overview</span>
            </button>
          </div>

          <div className="flex flex-1 items-center px-8">
            <div className="relative h-px w-full bg-[var(--border)]">
              <div
                className="absolute inset-y-0 left-0 bg-[var(--gold)] transition-[width] duration-500 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div
            className="wordmark text-[10px] text-fg-subtle"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {String(index + 1).padStart(2, "0")}
            <span className="mx-1 text-fg-subtle/60">/</span>
            {String(total).padStart(2, "0")}
          </div>
        </div>
      </div>

      {showOverview && (
        <div
          className="absolute inset-0 z-50 overflow-y-auto bg-[var(--bg)]/95 p-10 backdrop-blur-md fade-in"
          onClick={() => setShowOverview(false)}
        >
          <div className="mx-auto max-w-6xl">
            <div className="wordmark text-[11px] text-fg-muted">Overview</div>
            <h2 className="display serif mt-2 text-fg">All slides</h2>
            <div className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToSlide(i);
                    setShowOverview(false);
                  }}
                  className={`card p-4 text-left transition-colors hover:border-[var(--border-strong)] ${
                    i === index ? "border-[var(--gold)]" : ""
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <span
                      className="wordmark text-[10px] text-fg-subtle"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {i === index && (
                      <span className="wordmark text-[9px] text-gold">Now</span>
                    )}
                  </div>
                  <div className="mt-2 text-fg text-[15px] leading-5">
                    {s.title}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-8 meta">
              ← → to reveal · ↑ ↓ to jump slides · Esc for overview · Home / End
              to jump
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
