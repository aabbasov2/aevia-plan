"use client";

import { createContext, useContext, type ReactNode } from "react";

const StepContext = createContext<number>(0);

export function StepProvider({
  step,
  children,
}: {
  step: number;
  children: ReactNode;
}) {
  return <StepContext.Provider value={step}>{children}</StepContext.Provider>;
}

export function useStep() {
  return useContext(StepContext);
}

/**
 * Reveal wraps content that should appear starting at `at` step.
 * Fades in and translates up on entry. When hidden, keeps layout space
 * (opacity 0) so surrounding elements don't jump — unless `collapse` is set.
 */
export function Reveal({
  at,
  children,
  className = "",
  collapse = false,
  delay = 0,
}: {
  at: number;
  children: ReactNode;
  className?: string;
  collapse?: boolean;
  delay?: number;
}) {
  const step = useStep();
  const visible = step >= at;
  if (collapse && !visible) return null;
  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(6px)",
        transition: `opacity 520ms cubic-bezier(0.2,0.6,0.2,1) ${delay}ms, transform 520ms cubic-bezier(0.2,0.6,0.2,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/** Emphasize wraps content that gains gold color at step `at`. */
export function Emphasize({
  at,
  children,
  className = "",
}: {
  at: number;
  children: ReactNode;
  className?: string;
}) {
  const step = useStep();
  const active = step >= at;
  return (
    <span
      className={className}
      style={{
        color: active ? "var(--gold)" : "inherit",
        transition: "color 400ms ease",
      }}
    >
      {children}
    </span>
  );
}
