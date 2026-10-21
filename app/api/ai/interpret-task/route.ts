import { NextResponse } from "next/server";
import { generateGroqContent } from "@/lib/groq";

export const maxDuration = 30;

const MAX_INPUT_LENGTH = 2000;

const responseSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    taskCount: { type: "INTEGER" },
    durationMinutes: { type: "INTEGER" },
    deadlineDate: { type: "STRING" },
    project: {
      type: "STRING",
      enum: ["personal", "university", "work", "aevia", "travel"],
    },
    sessionMinutes: { type: "INTEGER" },
    splitIntoSessions: { type: "BOOLEAN" },
    needsClarification: { type: "BOOLEAN" },
    clarification: { type: "STRING" },
  },
  required: [
    "title",
    "taskCount",
    "durationMinutes",
    "deadlineDate",
    "project",
    "sessionMinutes",
    "splitIntoSessions",
    "needsClarification",
    "clarification",
  ],
} as const;

function extractCountedTaskDetails(text: string, today: string) {
  const countMatch = text.match(/\b(\d{1,2})\s+((?:[\w'-]+\s+){0,4})(?:tasks?|reviews?|reports?|items?)\b/i);
  const title = countMatch?.[2]?.trim().replace(/\s+/g, " ") || "";
  const durationMatch = text.match(/\b(\d{1,3})\s*(?:minutes?|mins?)\s+(?:each|apiece|per\s+(?:task|item|review))\b/i)
    ?? text.match(/\b(?:each|per\s+(?:task|item|review))\b.{0,48}\b(\d{1,3})\s*(?:minutes?|mins?)\b/i);
  const current = new Date(`${today}T00:00:00Z`);
  const endOfWeek = (next: boolean) => {
    const mondayOffset = (current.getUTCDay() + 6) % 7;
    const monday = new Date(current);
    monday.setUTCDate(current.getUTCDate() - mondayOffset + (next ? 7 : 0));
    monday.setUTCDate(monday.getUTCDate() + 6);
    return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, "0")}-${String(monday.getUTCDate()).padStart(2, "0")}`;
  };
  const deadlineDate = /\b(?:by\s+)?(?:the\s+)?end\s+of\s+next\s+week\b/i.test(text)
    ? endOfWeek(true)
    : /\b(?:by\s+)?(?:the\s+)?end\s+of\s+this\s+week\b/i.test(text)
      ? endOfWeek(false)
      : "";
  return {
    taskCount: countMatch ? Number(countMatch[1]) : undefined,
    title,
    durationMinutes: durationMatch ? Number(durationMatch[1]) : undefined,
    deadlineDate,
  };
}

export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "Groq is not configured yet. Add GROQ_API_KEY to .env.local and restart Aevia." },
      { status: 503 }
    );
  }

  let body: { message?: unknown; history?: unknown; today?: unknown; timeZone?: unknown };
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
  const history = Array.isArray(body.history) ? body.history.slice(-12).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const entry = item as { role?: unknown; content?: unknown };
    if ((entry.role !== "user" && entry.role !== "model") || typeof entry.content !== "string") return [];
    return [{ role: entry.role, parts: [{ text: entry.content.slice(0, 2000) }] }];
  }) : [];

  try {
    const response = await generateGroqContent({
      systemInstruction: {
        parts: [{ text: [
          "Prepare a proposal to add new task work to Aevia. Use the current request and conversation history together so a short answer to a follow-up question inherits the original task details.",
          "Extract a concise singular task title, number of separate tasks (taskCount), effort in minutes per task, a deadline date, project, and suggested focus-session length.",
          "If the user gives a count of separate deliverables (for example, 8 reviews), use that count and prepare one task per deliverable. Use taskCount=1 when no count is specified. Do not ask whether counted plural tasks should be separate; assume they are separate unless the user explicitly says otherwise.",
          "Use the supplied current date and IANA timezone when interpreting relative dates and dates without a year. For a date without a year, choose the next occurrence on or after today.",
          "A date-only deadline means the end of that local calendar day. For 'by the end of next week', use the Sunday at the end of the next Monday-to-Sunday work week in the supplied timezone. Return deadlineDate as YYYY-MM-DD, or an empty string if no deadline was provided.",
          "Never invent an effort estimate or deadline that the user did not provide. A deadline is optional: when the user asks to find time for a task and gives its title and effort, prepare the task without asking for a deadline. Ask one concise question only if the title or effort is genuinely missing.",
          "Keep each task in one uninterrupted calendar block by default, up to 120 minutes. Set sessionMinutes equal to the total task duration when it is 120 minutes or less. Set splitIntoSessions=false unless the user explicitly asks to split the work. For tasks longer than 120 minutes, set splitIntoSessions=true and choose substantial sessions between 60 and 120 minutes. Do not create semantic subtasks unless the user described them.",
          "Use project 'work' when no project context is clear.",
        ].join(" ") }],
      },
      contents: [...history, { role: "user", parts: [{ text: `Current date: ${today}\nTimezone: ${timeZone}\nCurrent request: ${body.message.trim()}` }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.1,
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      console.error("Groq task interpretation failed", response.status, errorBody?.error?.code ?? "unknown");
      return NextResponse.json({ error: "Aevia couldn't interpret that request. Check the Groq API key and try again." }, { status: 502 });
    }

    const payload = await response.json();
    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("");
    if (typeof text !== "string" || !text) {
      return NextResponse.json({ error: "Groq returned an empty response. Please try again." }, { status: 502 });
    }

    const parsed = JSON.parse(text);
    const userConversation = [
      ...history.filter((entry) => entry.role === "user").map((entry) => entry.parts[0].text),
      body.message.trim(),
    ].join("\n");
    const extracted = extractCountedTaskDetails(userConversation, today);
    if (extracted.taskCount) parsed.taskCount = extracted.taskCount;
    if (extracted.title) parsed.title = extracted.title;
    if (extracted.durationMinutes) parsed.durationMinutes = extracted.durationMinutes;
    if (extracted.deadlineDate) parsed.deadlineDate = extracted.deadlineDate;
    if (extracted.taskCount && extracted.durationMinutes && extracted.deadlineDate) {
      parsed.needsClarification = false;
      parsed.clarification = "";
    }
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
      !Number.isInteger(parsed.taskCount) || parsed.taskCount < 1 || parsed.taskCount > 20 ||
      !Number.isInteger(parsed.durationMinutes) || parsed.durationMinutes < (parsed.needsClarification ? 0 : 5) || parsed.durationMinutes > 480 ||
      !validDate || !validProject ||
      !Number.isInteger(parsed.sessionMinutes) || parsed.sessionMinutes < 5 || parsed.sessionMinutes > 120 ||
      typeof parsed.splitIntoSessions !== "boolean" ||
      typeof parsed.needsClarification !== "boolean" || typeof parsed.clarification !== "string"
    ) {
      return NextResponse.json({ error: "Aevia couldn't verify the details in that request. Try rephrasing it." }, { status: 502 });
    }

    return NextResponse.json({
      title: parsed.title.trim().slice(0, 160),
      taskCount: parsed.taskCount,
      durationMinutes: parsed.durationMinutes,
      deadlineDate: parsed.deadlineDate,
      project: parsed.project,
      sessionMinutes: parsed.sessionMinutes,
      splitIntoSessions: parsed.splitIntoSessions,
      needsClarification: parsed.needsClarification,
      clarification: parsed.clarification.trim().slice(0, 240),
    });
  } catch (error) {
    console.error("Groq task interpretation request failed", error instanceof Error ? error.name : "unknown error");
    return NextResponse.json({ error: "Aevia couldn't reach Groq just now. Please try again." }, { status: 502 });
  }
}
