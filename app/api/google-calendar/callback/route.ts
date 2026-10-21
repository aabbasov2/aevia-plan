import { NextRequest, NextResponse } from "next/server";
import {
  createGoogleAdminClient,
  decryptGoogleToken,
  encryptGoogleToken,
  getAeviaUser,
  getGoogleConnection,
  googleCalendarIsConfigured,
  googleOAuthConfig,
  verifyOAuthState,
} from "@/lib/google-calendar-server";

const STATE_COOKIE = "aevia-google-oauth-state";
const SETTINGS_URL = "/settings/password";

function finish(request: NextRequest, status: string) {
  const response = NextResponse.redirect(new URL(`${SETTINGS_URL}?googleCalendar=${status}`, request.url));
  response.cookies.set(STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/google-calendar/callback",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const user = await getAeviaUser();
  if (!user) return finish(request, "error");
  if (!googleCalendarIsConfigured()) return finish(request, "not_configured");
  const state = request.nextUrl.searchParams.get("state") ?? "";
  const nonce = request.cookies.get(STATE_COOKIE)?.value ?? "";
  if (!verifyOAuthState(state, nonce, user.id)) return finish(request, "error");
  if (request.nextUrl.searchParams.has("error")) return finish(request, "denied");
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return finish(request, "error");

  try {
    const config = googleOAuthConfig()!;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const tokens = await tokenResponse.json().catch(() => null);
    if (!tokenResponse.ok || typeof tokens?.access_token !== "string") return finish(request, "error");

    const existing = await getGoogleConnection(user.id);
    const refreshToken = typeof tokens.refresh_token === "string" ? tokens.refresh_token : existing && decryptGoogleToken(existing.refresh_token_ciphertext);
    if (!refreshToken) return finish(request, "error");

    const identityResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(10_000),
    });
    const identity = await identityResponse.json().catch(() => null);
    if (!identityResponse.ok || typeof identity?.email !== "string") return finish(request, "error");

    const db = createGoogleAdminClient();
    const { error } = await db.from("google_calendar_connections").upsert({
      user_id: user.id,
      google_email: identity.email,
      refresh_token_ciphertext: encryptGoogleToken(refreshToken),
      token_scope: typeof tokens.scope === "string" ? tokens.scope : "openid email https://www.googleapis.com/auth/calendar.events",
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return finish(request, "connected");
  } catch (error) {
    console.error("Google Calendar OAuth callback failed", error instanceof Error ? error.message : "unknown error");
    return finish(request, "error");
  }
}
