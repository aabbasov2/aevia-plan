import { NextResponse } from "next/server";

export const maxDuration = 60;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const EVENT_KINDS = ["meeting", "task", "focus"] as const;
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const VISION_MODELS = ["qwen/qwen3.8-27b", "qwen/qwen3.6-27b"] as const;

type EventKind = (typeof EVENT_KINDS)[number];
type ExtractedEvent = {
  title: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  kind: EventKind;
  confidence: number;
  needsReview: boolean;
};

const INSTRUCTIONS = [
  "Act as a careful OCR reader for a calendar screenshot. Return JSON only, with an events array. Accuracy matters more than returning many events.",
  "First identify the weekday/date column headers, the all-day event lane, and the timed grid using its hour labels and horizontal grid lines. Only extract colored blocks whose rectangles are visibly inside the timed grid. Ignore every all-day banner, including multi-day bars, even if it contains a readable title. Never convert an all-day banner into a 09:00-to-17:00 (or other timed) event.",
  "Scan the calendar one date column at a time, from left to right, and inspect each timed-grid block from top to bottom. Include every timed block in each column, including narrow blocks and blocks that overlap other blocks. Transcribe each separate timed block once. Do not infer recurring events, fill gaps, or invent events based on patterns. Preserve readable title text; use a short partial title rather than guessing. If it is unclear whether a block is in the all-day lane or timed grid, omit it rather than assigning a guessed time.",
  "For each block return: title (string), weekday (full weekday name from its column), dayOfMonth (integer shown in that column header, or null), month (integer 1-12 only if visibly shown, otherwise null), year (integer only if visibly shown, otherwise null), startTime and endTime (24-hour HH:mm), confidence (0-1), and needsReview (boolean). Keep overlapping blocks as separate events. Do not combine neighboring blocks.",
  "Use the time labels and grid lines to estimate block boundaries to the nearest 15 minutes. Mark needsReview=true for uncertain titles or boundaries, and for any event lasting 4 hours or longer so the user can verify it is a timed block rather than an all-day banner. Return an empty events array only when there are no visible timed blocks.",
  "Do not calculate ISO dates. Aevia will resolve them from the visible weekday/day number and the user's current local date. Do not include all-day banners.",
].join(" ");

export async function POST(request: Request) {
  const groqKey = process.env.GROQ_API_KEY;

  let body: { image?: unknown; mimeType?: unknown; today?: unknown; timeZone?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Send a valid image to import." }, { status: 400 }); }
  if (typeof body.image !== "string" || typeof body.mimeType !== "string" || !MIME_TYPES.has(body.mimeType)) {
    return NextResponse.json({ error: "Choose a PNG, JPG, or WebP calendar screenshot." }, { status: 400 });
  }
  const base64 = body.image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
  if (!base64 || base64.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 8 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    return NextResponse.json({ error: "The screenshot is empty or larger than 8 MB." }, { status: 400 });
  }
  if (Math.floor(base64.length * 3 / 4) > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "The screenshot must be 8 MB or smaller." }, { status: 400 });
  }
  if (!groqKey) {
    return NextResponse.json({ error: "Add GROQ_API_KEY to .env.local, then restart Aevia." }, { status: 503 });
  }

  const today = typeof body.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : new Date().toISOString().slice(0, 10);
  let events: ExtractedEvent[] = [];
  const failures: string[] = [];
  for (const [index, model] of VISION_MODELS.entries()) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: `${INSTRUCTIONS}\nUser's current local date: ${today}.` },
            { role: "user", content: [
              { type: "text", text: "Transcribe the timed events from this calendar image." },
              { type: "image_url", image_url: { url: `data:${body.mimeType};base64,${base64}` } },
            ] },
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 8192,
          reasoning_effort: "none",
        }),
        signal: AbortSignal.timeout(25_000),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        const errorCode = typeof detail?.error?.code === "string" ? detail.error.code : "unknown";
        failures.push(`${model}:${response.status}:${errorCode}`);
        console.warn("Calendar import model failed", { model, status: response.status, code: errorCode, fallback: index < VISION_MODELS.length - 1 });
        if (response.status === 401 || response.status === 403) {
          return NextResponse.json({ error: "Groq rejected GROQ_API_KEY. Check the key in your environment and restart Aevia." }, { status: 502 });
        }
        continue;
      }

      const responseBody = await response.json();
      const candidate = parseModelJson(responseBody.choices?.[0]?.message?.content);
      if (!isRecord(candidate) || !Array.isArray(candidate.events)) {
        failures.push(`${model}:invalid_json`);
        console.warn("Calendar import model returned invalid event data", { model, fallback: index < VISION_MODELS.length - 1 });
        continue;
      }
      events = normalizeEvents(candidate, today);
      console.info("Calendar import Groq extraction", { model, eventCount: events.length });
      return NextResponse.json({ events });
    } catch (error) {
      const reason = error instanceof Error && error.name === "TimeoutError" ? "timeout" : "network_failure";
      failures.push(`${model}:${reason}`);
      console.warn("Calendar import model request failed", { model, reason, fallback: index < VISION_MODELS.length - 1 });
    }
  }

  console.error("Calendar import exhausted vision models", { failures });
  return NextResponse.json({ error: "Aevia's calendar reader is temporarily unavailable. Please try again in a moment." }, { status: 503 });
}

function parseModelJson(value: unknown): unknown {
  if (typeof value !== "string") return null;
  try { return JSON.parse(value); } catch { return null; }
}

function normalizeEvents(value: unknown, today: string): ExtractedEvent[] {
  if (!isRecord(value) || !Array.isArray(value.events)) return [];
  return value.events.slice(0, 100).flatMap((raw): ExtractedEvent[] => {
    if (!isRecord(raw) || typeof raw.title !== "string" || !raw.title.trim()) return [];
    const date = resolveDate(raw, today);
    if (!date) return [];
    const startTime = parseTime(raw.startTime);
    const endTime = parseTime(raw.endTime);
    let durationMinutes = 0;
    if (startTime && endTime) {
      const [startHour, startMinute] = startTime.split(":").map(Number);
      const [endHour, endMinute] = endTime.split(":").map(Number);
      durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
      if (durationMinutes <= 0) durationMinutes += 24 * 60;
      if (durationMinutes < 5 || durationMinutes > 1440) durationMinutes = 0;
    }
    const kind = inferKind(raw.title, raw.kind);
    const confidenceValue = raw.confidence;
    const hasConfidence = typeof confidenceValue === "number" && Number.isFinite(confidenceValue);
    const confidence = hasConfidence
      ? Math.max(0, Math.min(1, confidenceValue))
      : 0;
    return [{
      title: raw.title.trim().replace(/\s+/g, " ").slice(0, 180),
      date,
      startTime,
      durationMinutes,
      kind,
      confidence,
      needsReview: raw.needsReview === true || !startTime || durationMinutes === 0 || !hasConfidence || confidence < 0.65 || durationMinutes >= 240,
    }];
  });
}

function resolveDate(value: Record<string, unknown>, today: string): string | null {
  const explicitDate = typeof value.date === "string" && value.date.match(/^\d{4}-\d{2}-\d{2}$/) ? value.date : null;
  if (explicitDate && isRealDate(explicitDate)) return explicitDate;

  const day = typeof value.dayOfMonth === "number" ? value.dayOfMonth : extractDay(value.dayOfMonth ?? value.dateText);
  const weekday = typeof value.weekday === "string" ? value.weekday.toLowerCase() : "";
  const weekdayIndex = WEEKDAYS.indexOf(weekday);
  const month = typeof value.month === "number" && value.month >= 1 && value.month <= 12 ? value.month : null;
  const year = typeof value.year === "number" && value.year >= 1900 && value.year <= 2200 ? value.year : null;
  const [todayYear, todayMonth, todayDay] = today.split("-").map(Number);
  const todayTime = Date.UTC(todayYear, todayMonth - 1, todayDay);

  if (day && day >= 1 && day <= 31) {
    const years = year ? [year] : [todayYear - 1, todayYear, todayYear + 1];
    const months = month ? [month] : Array.from({ length: 12 }, (_, index) => index + 1);
    const matches: Array<{ date: string; distance: number; future: boolean }> = [];
    for (const candidateYear of years) for (const candidateMonth of months) {
      const date = `${candidateYear}-${String(candidateMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (!isRealDate(date)) continue;
      const dateTime = Date.UTC(candidateYear, candidateMonth - 1, day);
      if (weekdayIndex >= 0 && new Date(dateTime).getUTCDay() !== weekdayIndex) continue;
      matches.push({ date, distance: Math.abs(dateTime - todayTime), future: dateTime >= todayTime });
    }
    matches.sort((left, right) => Number(right.future) - Number(left.future) || left.distance - right.distance);
    if (matches[0]) return matches[0].date;
  }

  if (weekdayIndex >= 0) {
    for (let offset = 0; offset <= 7; offset += 1) {
      const dateTime = todayTime + offset * 24 * 60 * 60 * 1000;
      if (new Date(dateTime).getUTCDay() === weekdayIndex) return new Date(dateTime).toISOString().slice(0, 10);
    }
  }
  return null;
}

function extractDay(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value !== "string") return null;
  const match = value.match(/\b([1-9]|[12]\d|3[01])\b/);
  return match ? Number(match[1]) : null;
}

function parseTime(value: unknown): string {
  if (typeof value !== "string") return "";
  const cleaned = value.trim().toLowerCase().replace(/\./g, "");
  const match = cleaned.match(/\b(\d{1,2})(?::([0-5]\d))?\s*(am|pm)?\b/);
  if (!match) return "";
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  if (hour > 23 || (match[3] && (hour < 1 || hour > 12))) return "";
  if (match[3] === "pm" && hour < 12) hour += 12;
  if (match[3] === "am" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function inferKind(title: string, supplied: unknown): EventKind {
  if (typeof supplied === "string" && EVENT_KINDS.includes(supplied as EventKind)) return supplied as EventKind;
  const normalized = title.toLowerCase();
  if (/\bfocus\b|\bbreak\b/.test(normalized)) return "focus";
  if (/\btask\b|\bwork on\b|\bwrap up\b/.test(normalized)) return "task";
  return "meeting";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRealDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
