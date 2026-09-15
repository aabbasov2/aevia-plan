import { addDays, format, startOfWeek } from "date-fns";

export function weekStart(base = new Date()) {
  return startOfWeek(base, { weekStartsOn: 1 });
}

export function dayOfWeek(base: Date, index: number) {
  return addDays(weekStart(base), index);
}

export function formatHm(minutesFromMidnight: number) {
  const h = Math.floor(minutesFromMidnight / 60);
  const m = minutesFromMidnight % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function formatRange(startMin: number, durationMin: number) {
  return `${formatHm(startMin)} – ${formatHm(startMin + durationMin)}`;
}

export function humanDuration(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `${h}h`;
  return `${h}h${m}`;
}

export function humanDeadline(iso?: string) {
  if (!iso) return "No deadline";
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `Overdue · ${format(d, "EEE d MMM")}`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 7) return `${format(d, "EEEE")}`;
  return format(d, "EEE d MMM");
}

export function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function longDate(date = new Date()) {
  return format(date, "EEEE, MMMM d");
}
