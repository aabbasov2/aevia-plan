"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "flex items-center gap-2 text-fg-muted hover:text-fg transition-colors",
        compact ? "text-xs" : "text-[13px]"
      )}
      aria-label="Toggle theme"
    >
      {isDark ? <Moon size={14} /> : <Sun size={14} />}
      {!compact && <span>{isDark ? "Dark" : "Light"}</span>}
    </button>
  );
}
