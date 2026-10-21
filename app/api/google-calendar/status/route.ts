import { NextResponse } from "next/server";
import { getAeviaUser, getGoogleConnection, googleCalendarIsConfigured } from "@/lib/google-calendar-server";

export async function GET() {
  const user = await getAeviaUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage Google Calendar." }, { status: 401 });
  const configured = googleCalendarIsConfigured();
  if (!configured) return NextResponse.json({ configured, connected: false });
  try {
    const connection = await getGoogleConnection(user.id);
    return NextResponse.json({ configured, connected: Boolean(connection), email: connection?.google_email ?? null });
  } catch {
    return NextResponse.json({ error: "Google Calendar connection status is unavailable." }, { status: 503 });
  }
}
