"use client";

import {
  BriefcaseBusiness,
  CheckSquare,
  GraduationCap,
  Moon,
  Plane,
  Utensils,
  UserRound,
  Video,
  Laptop,
  type LucideIcon,
} from "lucide-react";
import type { CalendarEvent } from "@/lib/types";
import { AeviaArc } from "@/components/brand/AeviaArc";

const APPEARANCE: Record<CalendarEvent["kind"], { Icon: LucideIcon; accent: string }> = {
  meeting: { Icon: Video, accent: "#78b9ff" },
  focus: { Icon: Laptop, accent: "#c3a0ff" },
  personal: { Icon: Moon, accent: "#c4c8d8" },
  task: { Icon: CheckSquare, accent: "#d8b26a" },
  lunch: { Icon: Utensils, accent: "#f0b875" },
};

const PROJECT_ICON: Partial<Record<NonNullable<CalendarEvent["project"]>, LucideIcon>> = {
  personal: UserRound,
  university: GraduationCap,
  work: BriefcaseBusiness,
  travel: Plane,
};

export function calendarEventAccent(event: CalendarEvent) {
  return event.kind === "task" && event.project && event.project !== "aevia"
    ? {
        personal: "#e2b58a",
        university: "#a9c58e",
        work: "#a9c5e3",
        travel: "#e0a78e",
      }[event.project]
    : APPEARANCE[event.kind].accent;
}

export function CalendarEventIdentity({
  event,
  size = "normal",
}: {
  event: CalendarEvent;
  size?: "normal" | "small" | "tiny";
}) {
  const isAeviaTask = event.kind === "task" && event.project === "aevia";
  const Icon = event.kind === "task" && event.project
    ? PROJECT_ICON[event.project] ?? APPEARANCE.task.Icon
    : APPEARANCE[event.kind].Icon;
  const accent = calendarEventAccent(event);
  const dimensions = size === "tiny" ? 14 : size === "small" ? 17 : 20;
  const iconSize = size === "tiny" ? 9 : size === "small" ? 10 : 12;

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[5px]"
      style={{
        width: dimensions,
        height: dimensions,
        color: accent,
        backgroundColor: `${accent}20`,
      }}
      aria-hidden="true"
    >
      {isAeviaTask ? <AeviaArc size={iconSize} /> : <Icon size={iconSize} strokeWidth={2.1} />}
    </span>
  );
}
