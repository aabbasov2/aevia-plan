"use client";

import { cn } from "@/lib/cn";

type Props = {
  size?: number;
  className?: string;
  pulse?: boolean;
  monochrome?: boolean;
};

export function AeviaArc({ size = 24, className, pulse = false, monochrome = false }: Props) {
  const gradientId = `arc-grad-${monochrome ? "mono" : "gold"}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn(pulse && "arc-pulse", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="8" y1="52" x2="56" y2="12" gradientUnits="userSpaceOnUse">
          {monochrome ? (
            <>
              <stop offset="0" stopColor="currentColor" stopOpacity="0.6" />
              <stop offset="1" stopColor="currentColor" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#7A5A22" />
              <stop offset="0.5" stopColor="#D8B26A" />
              <stop offset="1" stopColor="#EFD9A8" />
            </>
          )}
        </linearGradient>
      </defs>
      {/* The Arc: two overlapping sweeping curves forming a peak */}
      <path
        d="M6 52 C 20 52, 24 20, 32 12 C 40 20, 44 52, 58 52 C 46 46, 40 30, 32 22 C 24 30, 18 46, 6 52 Z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}
