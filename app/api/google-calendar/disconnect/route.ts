import { NextResponse } from "next/server";
import { createGoogleAdminClient, decryptGoogleToken, getAeviaUser, getGoogleConnection, googleCalendarIsConfigured } from "@/lib/google-calendar-server";

export async function POST() {
  const user = await getAeviaUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage Google Calendar." }, { status: 401 });
  if (!googleCalendarIsConfigured()) return NextResponse.json({ error: "Google Calendar is not configured." }, { status: 503 });
  try {
    const connection = await getGoogleConnection(user.id);
    if (connection) {
      const token = decryptGoogleToken(connection.refresh_token_ciphertext);
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token }),
        signal: AbortSignal.timeout(10_000),
      }).catch(() => undefined);
      const { error } = await createGoogleAdminClient().from("google_calendar_connections").delete().eq("user_id", user.id);
      if (error) throw error;
    }
    return NextResponse.json({ disconnected: true });
  } catch {
    return NextResponse.json({ error: "Google Calendar could not be disconnected right now." }, { status: 503 });
  }
}
