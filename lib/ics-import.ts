export type IcsImportItem = {
  title: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  kind: "meeting" | "task" | "focus";
  confidence: number;
  needsReview: boolean;
  allDay?: boolean;
};

type Property = { name: string; params: Record<string, string>; value: string };
type CalendarEvent = { properties: Property[] };
type IcsDate = { year: number; month: number; day: number; hour: number; minute: number; second: number; dateOnly: boolean; utc: boolean; timezone?: string };
type Recurrence = { frequency: string; interval: number; count?: number; until?: IcsDate; weekdays?: number[]; monthDays?: number[]; months?: number[] };

const WEEKDAYS: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const EVENT_LIMIT = 500;

export function parseIcsCalendar(text: string, rangeStartValue: string, rangeEndValue: string): IcsImportItem[] {
  if (text.length > 8 * 1024 * 1024) throw new Error("This calendar file is larger than 8 MB.");
  const rangeStartDate = parseRangeDate(rangeStartValue);
  const rangeEndDate = parseRangeDate(rangeEndValue);
  if (!rangeStartDate || !rangeEndDate) throw new Error("Choose a valid start and end date for the import.");
  if (rangeEndDate.getTime() < rangeStartDate.getTime()) throw new Error("The import end date must be on or after its start date.");
  if ((rangeEndDate.getTime() - rangeStartDate.getTime()) / 86400000 > 366) throw new Error("Choose an import range of one year or less.");
  const rangeStart = { year: rangeStartDate.getFullYear(), month: rangeStartDate.getMonth() + 1, day: rangeStartDate.getDate() };
  const rangeEndExclusive = { year: rangeEndDate.getFullYear(), month: rangeEndDate.getMonth() + 1, day: rangeEndDate.getDate() + 1 };
  const rangeStartMs = rangeStartDate.getTime();
  const rangeEndMs = new Date(rangeEndDate.getFullYear(), rangeEndDate.getMonth(), rangeEndDate.getDate() + 1).getTime();
  const lines = text.replace(/^\uFEFF/, "").replace(/\r?\n[ \t]/g, "").replace(/\r/g, "").split("\n");
  if (!lines.some((line) => line.trim().toUpperCase() === "BEGIN:VCALENDAR")) throw new Error("This file doesn’t look like an iCalendar (.ics) file.");
  const sourceEvents: CalendarEvent[] = [];
  let current: CalendarEvent | null = null;
  for (const line of lines) {
    const normalized = line.trimEnd();
    if (normalized.toUpperCase() === "BEGIN:VEVENT") { current = { properties: [] }; continue; }
    if (normalized.toUpperCase() === "END:VEVENT") { if (current) sourceEvents.push(current); current = null; continue; }
    if (current) {
      const property = parseProperty(normalized);
      if (property) current.properties.push(property);
    }
  }
  if (!sourceEvents.length) throw new Error("No calendar events were found in this .ics file.");
  const overrideDates = new Map<string, string[]>();
  for (const event of sourceEvents) {
    const recurrenceId = findProperty(event.properties, "RECURRENCE-ID");
    if (!recurrenceId) continue;
    const uid = valueOf(event.properties, "UID") || "";
    const date = parseDate(recurrenceId);
    if (!date) continue;
    overrideDates.set(uid, [...(overrideDates.get(uid) ?? []), dateKey(date)]);
  }

  // Imported events can last up to seven days, so expand recurring series from
  // a week before the chosen range to retain events that overlap its first day.
  const recurrenceStart = addDays(rangeStart, -7);
  const imported: IcsImportItem[] = [];
  for (const event of sourceEvents) {
    const properties = event.properties;
    if (valueOf(properties, "STATUS")?.toUpperCase() === "CANCELLED") continue;
    const startProperty = findProperty(properties, "DTSTART");
    if (!startProperty) continue;
    validateTimezone(startProperty.params.TZID);
    const start = parseDate(startProperty);
    if (!start) continue;
    const end = findProperty(properties, "DTEND");
    validateTimezone(end?.params.TZID);
    const parsedEnd = end ? parseDate(end) : null;
    let duration = parsedEnd ? Math.round((toDate(parsedEnd).getTime() - toDate(start).getTime()) / 60000) : parseDuration(valueOf(properties, "DURATION"));
    if (start.dateOnly && parsedEnd?.dateOnly) {
      duration = Math.round((Date.UTC(parsedEnd.year, parsedEnd.month - 1, parsedEnd.day) - Date.UTC(start.year, start.month - 1, start.day)) / 60000);
    }
    if (duration <= 0) duration = start.dateOnly ? 1440 : 60;
    duration = Math.min(duration, 10080);
    const title = unescapeText(valueOf(properties, "SUMMARY") || "Untitled event").replace(/\s+/g, " ").trim().slice(0, 180);
    const recurrenceId = findProperty(properties, "RECURRENCE-ID");
    const recurrence = recurrenceId ? null : parseRecurrence(valueOf(properties, "RRULE"));
    const excluded = [...findProperties(properties, "EXDATE").flatMap((prop) =>
      prop.value.split(",").map((value) => parseDate({ ...prop, value })).filter((date): date is IcsDate => Boolean(date)).map(dateKey)
    ), ...(overrideDates.get(valueOf(properties, "UID") || "") ?? [])];
    const occurrences = recurrence ? expand(start, recurrence, recurrenceStart, rangeEndExclusive) : [start];
    for (const occurrence of occurrences) {
      if (excluded.includes(dateKey(occurrence))) continue;
      const common = { title, durationMinutes: duration, kind: inferKind(title), confidence: 1, needsReview: false };
      if (occurrence.dateOnly) {
        const days = Math.max(1, Math.ceil(duration / 1440));
        for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
          const day = shiftDate(occurrence, dayOffset);
          const dayMs = new Date(day.year, day.month - 1, day.day).getTime();
          if (dayMs < rangeStartMs || dayMs >= rangeEndMs) continue;
          if (imported.length >= EVENT_LIMIT) throw new Error("This file contains more than 500 importable events in the selected date range. Choose a shorter range and try again.");
          imported.push({ ...common, date: dateString(day), startTime: "00:00", durationMinutes: 1440, allDay: true });
        }
      } else {
        const local = toDate(occurrence);
        const eventEnd = new Date(local.getTime() + duration * 60000);
        if (local.getTime() >= rangeEndMs || eventEnd.getTime() <= rangeStartMs) continue;
        if (imported.length >= EVENT_LIMIT) throw new Error("This file contains more than 500 importable events in the selected date range. Choose a shorter range and try again.");
        imported.push({
          ...common,
          date: localDate(local),
          startTime: String(local.getHours()).padStart(2, "0") + ":" + String(local.getMinutes()).padStart(2, "0"),
        });
      }
    }
  }
  if (!imported.length) throw new Error("No importable events were found in this .ics file.");
  return imported;
}

function parseProperty(line: string): Property | null {
  const colon = line.indexOf(":");
  if (colon < 1) return null;
  const [rawName, ...rawParams] = line.slice(0, colon).split(";");
  const params: Record<string, string> = {};
  for (const item of rawParams) {
    const equals = item.indexOf("=");
    if (equals > 0) params[item.slice(0, equals).toUpperCase()] = item.slice(equals + 1).replace(/^"|"$/g, "");
  }
  return { name: rawName.toUpperCase(), params, value: line.slice(colon + 1).trim() };
}

function findProperty(properties: Property[], name: string) { return properties.find((property) => property.name === name); }
function findProperties(properties: Property[], name: string) { return properties.filter((property) => property.name === name); }
function valueOf(properties: Property[], name: string) { return findProperty(properties, name)?.value; }

function parseDate(property: Property): IcsDate | null {
  const raw = property.value.trim();
  const dateOnly = property.params.VALUE?.toUpperCase() === "DATE" || /^\d{8}$/.test(raw);
  const match = dateOnly ? raw.match(/^(\d{4})(\d{2})(\d{2})$/) : raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?Z?$/);
  if (!match) return null;
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  const hour = Number(match[4] || 0); const minute = Number(match[5] || 0); const second = Number(match[6] || 0);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) return null;
  return { year, month, day, hour, minute, second, dateOnly, utc: !dateOnly && raw.endsWith("Z"), timezone: property.params.TZID };
}

function parseRecurrence(value?: string): Recurrence | null {
  if (!value) return null;
  const fields: Record<string, string> = {};
  for (const part of value.split(";")) {
    const index = part.indexOf("=");
    if (index > 0) fields[part.slice(0, index).toUpperCase()] = part.slice(index + 1);
  }
  const frequency = (fields.FREQ || "").toUpperCase();
  if (!["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(frequency)) return null;
  const unsupported = Object.keys(fields).filter((key) => !["FREQ", "INTERVAL", "COUNT", "UNTIL", "BYDAY", "BYMONTHDAY", "BYMONTH", "WKST"].includes(key));
  if (unsupported.length || ((frequency === "MONTHLY" || frequency === "YEARLY") && fields.BYDAY)) {
    throw new Error("This .ics file has a complex repeating event Aevia can’t expand safely yet. Export that event as individual dates or remove its advanced recurrence rule, then try again.");
  }
  const until = fields.UNTIL ? parseDate({ name: "UNTIL", params: {}, value: fields.UNTIL }) ?? undefined : undefined;
  const weekdays = fields.BYDAY?.split(",").map((day) => WEEKDAYS[day.replace(/^[+-]?\d+/, "").toUpperCase()]).filter((day) => day !== undefined);
  const monthDays = fields.BYMONTHDAY?.split(",").map(Number).filter((day) => Number.isInteger(day) && day !== 0 && Math.abs(day) <= 31);
  const months = fields.BYMONTH?.split(",").map(Number).filter((month) => Number.isInteger(month) && month >= 1 && month <= 12);
  return {
    frequency,
    interval: Math.max(1, Math.min(366, Number(fields.INTERVAL) || 1)),
    count: Number(fields.COUNT) > 0 ? Number(fields.COUNT) : undefined,
    until,
    weekdays: weekdays?.length ? weekdays : undefined,
    monthDays: monthDays?.length ? monthDays : undefined,
    months: months?.length ? months : undefined,
  };
}

function expand(start: IcsDate, rule: Recurrence, rangeStart: { year: number; month: number; day: number }, rangeEnd: { year: number; month: number; day: number }) {
  const base = Date.UTC(start.year, start.month - 1, start.day);
  const from = Date.UTC(rangeStart.year, rangeStart.month - 1, rangeStart.day);
  const until = Date.UTC(rangeEnd.year, rangeEnd.month - 1, rangeEnd.day);
  const maxInstant = rule.until ? toDate(rule.until).getTime() : Infinity;
  const results: IcsDate[] = [];
  let count = 0;
  const add = (timestamp: number, matches: boolean) => {
    if (!matches || timestamp < base) return;
    const day = new Date(timestamp);
    const occurrence = { ...start, year: day.getUTCFullYear(), month: day.getUTCMonth() + 1, day: day.getUTCDate() };
    if (toDate(occurrence).getTime() > maxInstant || (rule.count && count >= rule.count)) return;
    count += 1;
    if (timestamp >= from && timestamp < until) results.push(occurrence);
  };

  if (rule.frequency === "DAILY" || rule.frequency === "WEEKLY") {
    const baseWeekday = new Date(base).getUTCDay();
    const mondayBase = base - ((baseWeekday + 6) % 7) * 86400000;
    for (let dayIndex = 0, time = base; time < until && dayIndex < 200000 && results.length <= EVENT_LIMIT; dayIndex += 1, time += 86400000) {
      const weekday = new Date(time).getUTCDay();
      const dayOfMonth = new Date(time).getUTCDate();
      const month = new Date(time).getUTCMonth() + 1;
      const matches = rule.frequency === "DAILY"
        ? dayIndex % rule.interval === 0
        : Math.floor((time - ((weekday + 6) % 7) * 86400000 - mondayBase) / (7 * 86400000)) % rule.interval === 0 && (rule.weekdays ?? [baseWeekday]).includes(weekday);
      const monthDayMatches = !rule.monthDays?.length || rule.monthDays.some((raw) => raw < 0 ? new Date(Date.UTC(new Date(time).getUTCFullYear(), month, 0)).getUTCDate() + raw + 1 === dayOfMonth : raw === dayOfMonth);
      add(time, matches && (!rule.weekdays || rule.frequency === "WEEKLY" || rule.weekdays.includes(weekday)) && (!rule.months || rule.months.includes(month)) && monthDayMatches);
      if (rule.count && count >= rule.count) break;
    }
    return results;
  }

  let year = start.year;
  if (rule.frequency === "YEARLY") {
    for (let yearOffset = 0; yearOffset < 500 && results.length <= EVENT_LIMIT; yearOffset += rule.interval) {
      const thisYear = start.year + yearOffset;
      for (const thisMonth of rule.months ?? [start.month]) {
        const last = new Date(Date.UTC(thisYear, thisMonth, 0)).getUTCDate();
        for (const rawDay of rule.monthDays ?? [start.day]) {
          const day = rawDay < 0 ? last + rawDay + 1 : rawDay;
          if (day < 1 || day > last) continue;
          const time = Date.UTC(thisYear, thisMonth - 1, day);
          if (time >= until) return results;
          add(time, true);
          if (rule.count && count >= rule.count) return results;
        }
      }
    }
    return results;
  }
  let month = start.month;
  for (let guard = 0; guard < 5000 && results.length <= EVENT_LIMIT; guard += 1) {
    const monthOffset = (year - start.year) * 12 + month - start.month;
    if (rule.frequency === "MONTHLY" && monthOffset > 0 && monthOffset % rule.interval !== 0) {
      month += 1; if (month > 12) { month = 1; year += 1; } continue;
    }
    if (rule.months && !rule.months.includes(month)) { month += 1; if (month > 12) { month = 1; year += 1; } continue; }
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    for (const rawDay of rule.monthDays ?? [start.day]) {
      const day = rawDay < 0 ? last + rawDay + 1 : rawDay;
      if (day < 1 || day > last) continue;
      const time = Date.UTC(year, month - 1, day);
      if (time >= until) return results;
      add(time, true);
      if (rule.count && count >= rule.count) return results;
    }
    month += 1; if (month > 12) { month = 1; year += 1; }
  }
  return results;
}

function toDate(value: IcsDate): Date {
  if (value.dateOnly) return new Date(value.year, value.month - 1, value.day);
  if (value.utc) return new Date(Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, value.second));
  if (!value.timezone) return new Date(value.year, value.month - 1, value.day, value.hour, value.minute, value.second);
  try {
    let timestamp = Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, value.second);
    const desired = timestamp;
    const formatter = new Intl.DateTimeFormat("en-GB", { timeZone: value.timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
    for (let i = 0; i < 3; i += 1) {
      const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]));
      const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
      timestamp += desired - represented;
    }
    return new Date(timestamp);
  } catch {
    throw new Error("This .ics file uses a time zone Aevia can’t read. Export it in UTC or a standard IANA time zone and try again.");
  }
}

function validateTimezone(timezone?: string) {
  if (!timezone) return;
  try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }); }
  catch { throw new Error("This .ics file uses a time zone Aevia can’t read. Export it in UTC or a standard IANA time zone and try again."); }
}

function parseDuration(value?: string) {
  if (!value) return 0;
  const match = value.match(/^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
  if (!match) return 0;
  return Number(match[1] || 0) * 10080 + Number(match[2] || 0) * 1440 + Number(match[3] || 0) * 60 + Number(match[4] || 0) + Math.round(Number(match[5] || 0) / 60);
}
function addDays(date: { year: number; month: number; day: number }, amount: number) {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + amount));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}
function parseRangeDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day ? date : null;
}
function shiftDate(date: IcsDate, amount: number): IcsDate {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + amount));
  return { ...date, year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}
function dateKey(date: IcsDate) { return dateString(date) + "T" + String(date.hour).padStart(2, "0") + ":" + String(date.minute).padStart(2, "0"); }
function dateString(date: IcsDate) { return String(date.year).padStart(4, "0") + "-" + String(date.month).padStart(2, "0") + "-" + String(date.day).padStart(2, "0"); }
function localDate(date: Date) { return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0"); }
function unescapeText(value: string) { return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\"); }
function inferKind(title: string): IcsImportItem["kind"] {
  const normalized = title.toLowerCase();
  if (/\bfocus\b|\bbreak\b/.test(normalized)) return "focus";
  if (/\btask\b|\bwork on\b|\bdeep work\b|\bwrap up\b/.test(normalized)) return "task";
  return "meeting";
}
