import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createOAuthState, getAeviaUser, googleCalendarIsConfigured, googleOAuthConfig } from "@/lib/google-calendar-server";

const STATE_COOKIE = "aevia-google-oauth-state";

export async function GET(request: Request) {
  const user = await getAeviaUser();
  if (!user) return NextResponse.redirect(new URL("/signin", request.url));
  if (!googleCalendarIsConfigured()) {
    return NextResponse.redirect(new URL("/settings/password?googleCalendar=not_configured", request.url));
  }
  const config = googleOAuthConfig()!;
  const nonce = randomBytes(24).toString("base64url");
  const state = createOAuthState(user.id, nonce);
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  }).toString();
  const response = NextResponse.redirect(authorization);
  response.cookies.set(STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/google-calendar/callback",
    maxAge: 10 * 60,
  });
  return response;
}
