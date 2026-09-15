"use client";

export function MetricCard({
  label,
  value,
  unit,
  caption,
}: {
  label: string;
  value: string | number;
  unit?: string;
  caption?: string;
}) {
  return (
    <div className="card group relative p-5 transition-colors hover:border-[var(--border-strong)]">
      <div className="text-fg-subtle text-[11px] uppercase tracking-wider">{label}</div>
      <div className="mt-3 flex items-baseline gap-1">
        <span
          className="text-fg text-[36px] leading-9"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {value}
        </span>
        {unit && <span className="text-fg-muted text-[14px]">{unit}</span>}
      </div>
      {caption && <div className="mt-2 meta">{caption}</div>}
      <div className="absolute bottom-0 left-5 h-px w-6 origin-left scale-x-0 bg-gold transition-transform duration-300 group-hover:scale-x-100" />
    </div>
  );
}
