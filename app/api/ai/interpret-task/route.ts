import { NextResponse } from "next/server";

const MODEL = "gemini-3.8-flash";
const MAX_INPUT_LENGTH = 2000;

const responseSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    durationMinutes: { type: "INTEGER" },
    deadlineDate: { type: "STRING" },
    project: {
      type: "STRING",
      enum: ["personal", "university", "work", "aevia", "travel"],
    },
    sessionMinutes: { type: "INTEGER" },
    needsClarification: { type: "BOOLEAN" },
    clarification: { type: "STRING" },
  },
  required: [
    "title",
    "durationMinutes",
    "deadlineDate",
    "project",
    "sessionMinutes",
    "needsClarification",
    "clarification",
  ],
} as const;

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini is not configured yet. Add GEMINI_API_KEY to .env.local and restart Aevia." },
      { status: 503 }
    );
  }

  let body: { message?: unknown; today?: unknown; timeZone?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a valid task description." }, { status: 400 });
  }

  if (typeof body.message !== "string" || !body.message.trim() || body.message.length > MAX_INPUT_LENGTH) {
    return NextResponse.json({ error: `Task descriptions must be between 1 and ${MAX_INPUT_LENGTH} characters.` }, { status: 400 });
  }

  const today = typeof body.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
    ? body.today
    : new Date().toISOString().slice(0, 10);
  const timeZone = typeof body.timeZone === "string" && body.timeZone.length <= 80
    ? body.timeZone
    : "UTC";

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: [
            "Interpret a user's request to schedule one task in a calendar.",
            "Extract a concise task title, total estimated effort in minutes, a deadline date, project, and a suggested focus-session length.",
            "Use the supplied current date and IANA timezone when interpreting relative dates and dates without a year. For a date without a year, choose the next occurrence on or after today.",
            "A date-only deadline means the end of that local calendar day. Return deadlineDate as YYYY-MM-DD, or an empty string if no deadline was provided.",
            "Never invent an effort estimate or deadline that the user did not provide. If either is necessary to schedule and missing or unclear, set needsClarification=true and ask one concise question.",
            "Suggested focus sessions should be between 25 and 60 minutes, with shorter sessions for draining or long tasks. Do not create semantic subtasks unless the user described them.",
            "Use project 'work' when no project context is clear.",
          ].join(" ") }],
        },
        contents: [{ role: "user", parts: [{ text: `Current date: ${today}\nTimezone: ${timeZone}\nRequest: ${body.message.trim()}` }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.1,
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      console.error("Gemini task interpretation failed", response.status, errorBody?.error?.status ?? "unknown");
      return NextResponse.json({ error: "Aevia couldn't interpret that request. Check the Gemini API key and try again." }, { status: 502 });
    }

    const payload = await response.json();
    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("");
    if (typeof text !== "string" || !text) {
      return NextResponse.json({ error: "Gemini returned an empty response. Please try again." }, { status: 502 });
    }

    const parsed = JSON.parse(text);
    const validDate = parsed.deadlineDate === "" || (
      typeof parsed.deadlineDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(parsed.deadlineDate) &&
      (() => {
        const [year, month, day] = parsed.deadlineDate.split("-").map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
      })()
    );
    const validProject = ["personal", "university", "work", "aevia", "travel"].includes(parsed.project);
    if (
      typeof parsed.title !== "string" || (!parsed.title.trim() && !parsed.needsClarification) ||
      !Number.isInteger(parsed.durationMinutes) || parsed.durationMinutes < (parsed.needsClarification ? 0 : 5) || parsed.durationMinutes > 480 ||
      !validDate || !validProject ||
      !Number.isInteger(parsed.sessionMinutes) || parsed.sessionMinutes < 25 || parsed.sessionMinutes > 60 ||
      typeof parsed.needsClarification !== "boolean" || typeof parsed.clarification !== "string"
    ) {
      return NextResponse.json({ error: "Aevia couldn't verify the details in that request. Try rephrasing it." }, { status: 502 });
    }

    return NextResponse.json({
      title: parsed.title.trim().slice(0, 160),
      durationMinutes: parsed.durationMinutes,
      deadlineDate: parsed.deadlineDate,
      project: parsed.project,
      sessionMinutes: parsed.sessionMinutes,
      needsClarification: parsed.needsClarification,
      clarification: parsed.clarification.trim().slice(0, 240),
    });
  } catch (error) {
    console.error("Gemini task interpretation request failed", error instanceof Error ? error.name : "unknown error");
    return NextResponse.json({ error: "Aevia couldn't reach Gemini just now. Please try again." }, { status: 502 });
  }
}
