import { addDays, addMonths, format, startOfMonth } from "date-fns";
import type { Commitment, CommitmentCadence } from "./types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS_LONG = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function cadenceLabel(c: CommitmentCadence): string {
  switch (c.kind) {
    case "daily":
      return "Every day";
    case "weekly":
      return `Every ${DAYS_LONG[c.day] ?? "week"}`;
    case "monthly":
      return `Every ${ordinal(c.dayOfMonth)} of the month`;
    case "monthly-first-week":
      return "First week of every month";
    case "quarterly":
      return "Every quarter";
    case "yearly":
      return `${MONTHS[c.month]} ${c.day}, each year`;
  }
}

export function nextDue(c: CommitmentCadence, now = new Date()): Date {
  switch (c.kind) {
    case "daily": {
      const d = new Date(now);
      d.setHours(9, 0, 0, 0);
      if (d <= now) d.setDate(d.getDate() + 1);
      return d;
    }
    case "weekly": {
      const d = new Date(now);
      // Monday-based (0 = Mon)
      const jsDay = (d.getDay() + 6) % 7;
      const delta = (c.day - jsDay + 7) % 7;
      d.setDate(d.getDate() + (delta === 0 ? 7 : delta));
      d.setHours(9, 0, 0, 0);
      return d;
    }
    case "monthly": {
      const day = Math.min(c.dayOfMonth, 28);
      let d = new Date(now.getFullYear(), now.getMonth(), day, 9, 0, 0, 0);
      if (d <= now) d = new Date(now.getFullYear(), now.getMonth() + 1, day, 9, 0, 0, 0);
      return d;
    }
    case "monthly-first-week": {
      const first = startOfMonth(now);
      // First business day (Mon-Fri) of this month
      let day = first;
      while (day.getDay() === 0 || day.getDay() === 6) day = addDays(day, 1);
      if (day <= now) {
        const nextMonth = addMonths(first, 1);
        day = nextMonth;
        while (day.getDay() === 0 || day.getDay() === 6) day = addDays(day, 1);
      }
      day.setHours(9, 0, 0, 0);
      return day;
    }
    case "quarterly": {
      const year = now.getFullYear();
      const candidates = [0, 3, 6, 9].map(
        (m) => new Date(year, m + c.month, c.day, 9, 0, 0, 0)
      );
      const upcoming = candidates.find((d) => d > now);
      return upcoming ?? new Date(year + 1, c.month, c.day, 9, 0, 0, 0);
    }
    case "yearly": {
      const d = new Date(now.getFullYear(), c.month, c.day, 9, 0, 0, 0);
      if (d <= now) return new Date(now.getFullYear() + 1, c.month, c.day, 9, 0, 0, 0);
      return d;
    }
  }
}

export function nextDueLabel(c: Commitment, now = new Date()): string {
  const d = nextDue(c.cadence, now);
  const daysAway = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const prefix =
    daysAway <= 0
      ? "Today"
      : daysAway === 1
      ? "Tomorrow"
      : daysAway < 7
      ? DAYS_LONG[(((d.getDay() + 6) % 7) + 7) % 7]
      : format(d, "EEE d MMM");
  return prefix;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export { DAYS, MONTHS };
