import { NextResponse } from "next/server";
import {
  getAeviaUser,
  getGoogleAccessToken,
  getGoogleConnection,
  googleApiRequest,
  GoogleCalendarApiError,
  googleCalendarIsConfigured,
  googleEventTime,
  validGoogleCalendarEvents,
} from "@/lib/google-calendar-server";

export const maxDuration = 60;

type GoogleEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  htmlLink?: string;
  extendedProperties?: { private?: Record<string, string> };
};

function localEventFromGoogle(remote: GoogleEvent) {
  if (!remote.id) return null;
  if (remote.status === "cancelled") {
    return { googleEventId: remote.id, googleCalendarId: "primary", cancelled: true };
  }
  const startText = remote.start?.dateTime ?? remote.start?.date;
  if (!startText) return null;
  const start = remote.start?.dateTime ? new Date(remote.start.dateTime) : new Date(`${startText}T00:00:00.000Z`);
  const endText = remote.end?.dateTime ?? remote.end?.date;
  const end = endText
    ? new Date(remote.end?.dateTime ?? `${endText}T00:00:00.000Z`)
    : new Date(start.getTime() + 60 * 60_000);
  const durationMinutes = Math.max(1, Math.min(7 * 24 * 60, Math.round((end.getTime() - start.getTime()) / 60_000)));
  return {
    id: remote.extendedProperties?.private?.aeviaEventId ?? undefined,
    googleEventId: remote.id,
    googleCalendarId: "primary",
    title: remote.summary?.trim() || "Untitled event",
    start: start.toISOString(),
    durationMinutes,
    allDay: Boolean(remote.start?.date && !remote.start?.dateTime),
    kind: "meeting" as const,
    origin: "user" as const,
    locked: true,
    cancelled: false,
  };
}

export async function POST(request: Request) {
  const user = await getAeviaUser();
  if (!user) return NextResponse.json({ error: "Sign in to sync Google Calendar." }, { status: 401 });
  if (!googleCalendarIsConfigured()) return NextResponse.json({ error: "Google Calendar is not configured yet." }, { status: 503 });
  const payload = await request.json().catch(() => null);
  if (!validGoogleCalendarEvents(payload?.events)) return NextResponse.json({ error: "Calendar sync data is invalid." }, { status: 400 });

  try {
    const connection = await getGoogleConnection(user.id);
    if (!connection) return NextResponse.json({ error: "Connect a Google Calendar account first." }, { status: 409 });
    const accessToken = await getGoogleAccessToken(connection);
    const linked: Array<{ aeviaEventId: string; googleEventId: string }> = [];

    for (const event of payload.events) {
      if (!event.googleEventId && event.cancelled) continue;
      const body: Record<string, unknown> = {
        summary: event.title.trim(),
        ...googleEventTime(event),
        extendedProperties: { private: { aeviaEventId: event.id } },
      };
      if (event.cancelled) body.status = "cancelled";
      let result: GoogleEvent;
      if (event.googleEventId) {
        try {
          result = await googleApiRequest(accessToken, `/calendars/primary/events/${encodeURIComponent(event.googleEventId)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }) as GoogleEvent;
        } catch (error) {
          if (!(error instanceof GoogleCalendarApiError) || error.status !== 404 || event.cancelled) throw error;
          result = await googleApiRequest(accessToken, "/calendars/primary/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }) as GoogleEvent;
        }
      } else {
        result = await googleApiRequest(accessToken, "/calendars/primary/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }) as GoogleEvent;
      }
      if (result.id) linked.push({ aeviaEventId: event.id, googleEventId: result.id });
    }

    const now = new Date();
    const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60_000).toISOString();
    const timeMax = new Date(now.getTime() + 365 * 24 * 60 * 60_000).toISOString();
    const pulled: GoogleEvent[] = [];
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({ timeMin, timeMax, singleEvents: "true", showDeleted: "true", maxResults: "2500", orderBy: "startTime" });
      if (pageToken) params.set("pageToken", pageToken);
      const page = await googleApiRequest(accessToken, `/calendars/primary/events?${params.toString()}`) as { items?: GoogleEvent[]; nextPageToken?: string };
      pulled.push(...(page.items ?? []));
      pageToken = page.nextPageToken;
    } while (pageToken && pulled.length < 10_000);

    const events = pulled.map(localEventFromGoogle).filter(Boolean);
    return NextResponse.json({ events, linked });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Reconnect your calendar")) {
      return NextResponse.json({ error: "Google authorization expired. Reconnect your calendar." }, { status: 401 });
    }
    if (error instanceof GoogleCalendarApiError && error.status === 403) {
      return NextResponse.json({ error: "Google denied calendar access. Reconnect and approve event read/write access." }, { status: 403 });
    }
    if (error instanceof GoogleCalendarApiError && error.status === 429) {
      return NextResponse.json({ error: "Google Calendar is rate limiting requests. Try again shortly." }, { status: 429 });
    }
    console.error("Google Calendar sync failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Google Calendar sync failed. Try again in a moment." }, { status: 502 });
  }
}
