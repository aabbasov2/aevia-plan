import { NextResponse } from "next/server";
import { generateGeminiContent } from "@/lib/gemini";

const responseSchema = {
  type: "OBJECT",
  properties: {
    kind: { type: "STRING", enum: ["unavailable_window", "meeting_overrun", "clarification"] },
    date: { type: "STRING" },
    startTime: { type: "STRING" },
    endTime: { type: "STRING" },
    eventId: { type: "STRING" },
    newEndTime: { type: "STRING" },
    summary: { type: "STRING" },
    clarification: { type: "STRING" },
  },
  required: ["kind", "date", "startTime", "endTime", "eventId", "newEndTime", "summary", "clarification"],
} as const;

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Gemini is not configured. Add GEMINI_API_KEY to your environment and restart Aevia." }, { status: 503 });
  }

  let body: {
    message?: unknown;
    today?: unknown;
    timeZone?: unknown;
    workEndTime?: unknown;
    events?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a valid description of what changed." }, { status: 400 });
  }

  if (typeof body.message !== "string" || !body.message.trim() || body.message.length > 2000) {
    return NextResponse.json({ error: "Describe the change in 1–2,000 characters." }, { status: 400 });
  }

  const today = typeof body.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
    ? body.today
    : new Date().toISOString().slice(0, 10);
  const timeZone = typeof body.timeZone === "string" ? body.timeZone.slice(0, 80) : "UTC";
  const workEndTime = typeof body.workEndTime === "string" && /^\d{2}:\d{2}$/.test(body.workEndTime)
    ? body.workEndTime
    : "18:00";
  const events = Array.isArray(body.events)
    ? body.events.filter((event) => event && typeof event === "object").slice(0, 100)
    : [];

  try {
    const response = await generateGeminiContent(apiKey, {
      systemInstruction: {
        parts: [{ text: [
          "Interpret a user's report that their day or week changed, so a calendar can be replanned.",
          "Supported changes: a new unavailable time window, or a specific calendar meeting that ran late.",
          "For unavailable time, return the local date, startTime, and endTime as YYYY-MM-DD and HH:mm. If the user says they are unavailable for the rest of the day, use the supplied workEndTime as endTime.",
          "For a meeting overrun, select the matching eventId from the supplied calendar events, return its date and newEndTime, and leave startTime/endTime empty.",
          "Never invent a meeting or guess an ambiguous time. If the change cannot be represented confidently, set kind=clarification and ask one short question.",
          "Do not suggest or generate task schedules. The app's calendar planner will do that after validating your interpretation.",
        ].join(" ") }],
      },
      contents: [{ role: "user", parts: [{ text: [
        `Today: ${today}`,
        `Timezone: ${timeZone}`,
        `Workday ends: ${workEndTime}`,
        `User report: ${body.message.trim()}`,
        `Calendar events: ${JSON.stringify(events)}`,
      ].join("\n") }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema, temperature: 0.1 },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      console.error("Gemini disruption interpretation failed", response.status, errorBody?.error?.status ?? "unknown");
      return NextResponse.json({ error: "Aevia couldn't interpret that change. Check the Gemini API key and try again." }, { status: 502 });
    }

    const payload = await response.json();
    const text = payload.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("");
    if (!text) return NextResponse.json({ error: "Gemini returned an empty response. Please try again." }, { status: 502 });
    const parsed = JSON.parse(text);
    if (![
      "unavailable_window",
      "meeting_overrun",
      "clarification",
    ].includes(parsed.kind) || typeof parsed.summary !== "string" || typeof parsed.clarification !== "string") {
      return NextResponse.json({ error: "Aevia couldn't verify that change. Try rephrasing it." }, { status: 502 });
    }

    const validDate = typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) &&
      !Number.isNaN(Date.parse(`${parsed.date}T00:00:00Z`));
    const validTime = (value: unknown) => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    if (parsed.kind === "unavailable_window" && (!validDate || !validTime(parsed.startTime) || !validTime(parsed.endTime) || parsed.startTime >= parsed.endTime)) {
      return NextResponse.json({ error: "Aevia couldn't verify the unavailable time window. Try including a start and end time." }, { status: 502 });
    }
    if (parsed.kind === "meeting_overrun") {
      const knownIds = new Set(events.map((event: { id?: string }) => event.id));
      if (!validDate || typeof parsed.eventId !== "string" || !knownIds.has(parsed.eventId) || !validTime(parsed.newEndTime)) {
        return NextResponse.json({ error: "Aevia couldn't match that meeting to your calendar. Try naming it and its new end time." }, { status: 502 });
      }
    }

    return NextResponse.json({
      kind: parsed.kind,
      date: parsed.date,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      eventId: parsed.eventId,
      newEndTime: parsed.newEndTime,
      summary: parsed.summary.trim().slice(0, 240),
      clarification: parsed.clarification.trim().slice(0, 240),
    });
  } catch (error) {
    console.error("Gemini disruption request failed", error instanceof Error ? error.name : "unknown error");
    return NextResponse.json({ error: "Aevia couldn't reach Gemini just now. Please try again." }, { status: 502 });
  }
}
