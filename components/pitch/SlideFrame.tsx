import type { ReactNode } from "react";

export function SlideFrame({
  label,
  children,
  className = "",
  bg = "plain",
}: {
  label?: string;
  children: ReactNode;
  className?: string;
  bg?: "plain" | "radial" | "grid";
}) {
  const bgClass =
    bg === "radial"
      ? "deck-radial"
      : bg === "grid"
        ? "deck-grid-bg"
        : "";
  return (
    <div className={`relative h-full w-full ${bgClass}`}>
      <div
        className={`mx-auto flex h-full w-full max-w-[1440px] flex-col justify-center px-24 py-24 ${className}`}
      >
        {label && (
          <div className="mb-8 flex items-center gap-3">
            <span className="wordmark text-[10px] text-fg-subtle">{label}</span>
            <span className="h-px w-10 bg-[var(--border-strong)]" />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
