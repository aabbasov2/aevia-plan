import { createHmac, createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createUserClient } from "@/lib/supabase/server";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_API_BASE = "https://www.googleapis.com/calendar/v3";
const TOKEN_ALGORITHM = "aes-256-gcm";

export type GoogleCalendarConnection = {
  user_id: string;
  google_email: string;
  refresh_token_ciphertext: string;
  token_scope: string;
  created_at: string;
  updated_at: string;
};

export type GoogleCalendarEventInput = {
  id: string;
  googleEventId?: string;
  title: string;
  start: string;
  durationMinutes: number;
  kind: "meeting" | "focus" | "personal" | "task" | "lunch";
  cancelled?: boolean;
  allDay?: boolean;
};

export function googleOAuthConfig() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALENDAR_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALENDAR_REDIRECT_URI) return null;
  return { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, redirectUri: GOOGLE_CALENDAR_REDIRECT_URI };
}

export function googleCalendarIsConfigured() {
  const encoded = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  return Boolean(googleOAuthConfig() && encoded && Buffer.from(encoded, "base64").length === 32 && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL);
}

function tokenEncryptionKey() {
  const encoded = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!encoded) throw new Error("Google Calendar token encryption is not configured.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return key;
}

export function encryptGoogleToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(TOKEN_ALGORITHM, tokenEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptGoogleToken(value: string) {
  const [version, encodedIv, encodedTag, encodedCiphertext] = value.split(".");
  if (version !== "v1" || !encodedIv || !encodedTag || !encodedCiphertext) throw new Error("Stored Google Calendar token is invalid.");
  const decipher = createDecipheriv(TOKEN_ALGORITHM, tokenEncryptionKey(), Buffer.from(encodedIv, "base64url"));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encodedCiphertext, "base64url")), decipher.final()]).toString("utf8");
}

export function createOAuthState(userId: string, nonce: string) {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("Google OAuth is not configured.");
  const payload = `${userId}.${nonce}.${Date.now()}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyOAuthState(value: string, expectedNonce: string, userId: string) {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) return false;
  const [stateUserId, nonce, timestampText, signature] = value.split(".");
  const timestamp = Number(timestampText);
  if (!stateUserId || !nonce || !timestampText || !signature || nonce !== expectedNonce || stateUserId !== userId) return false;
  if (!Number.isFinite(timestamp) || Date.now() - timestamp > 10 * 60_000 || timestamp > Date.now() + 30_000) return false;
  const payload = `${stateUserId}.${nonce}.${timestampText}`;
  const expected = createHmac("sha256", secret).update(payload).digest();
  let received: Buffer;
  try { received = Buffer.from(signature, "base64url"); } catch { return false; }
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function createGoogleAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server credentials are not configured.");
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function getAeviaUser() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function getGoogleConnection(userId: string) {
  const { data, error } = await createGoogleAdminClient()
    .from("google_calendar_connections")
    .select("user_id, google_email, refresh_token_ciphertext, token_scope, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Google Calendar connection could not be loaded.");
  return data as GoogleCalendarConnection | null;
}

export async function getGoogleAccessToken(connection: GoogleCalendarConnection) {
  const config = googleOAuthConfig();
  if (!config) throw new Error("Google OAuth is not configured.");
  const refreshToken = decryptGoogleToken(connection.refresh_token_ciphertext);
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || typeof data?.access_token !== "string") {
    if (data?.error === "invalid_grant") throw new Error("Google authorization expired. Reconnect your calendar.");
    throw new Error("Google Calendar could not authorize the request.");
  }
  return data.access_token as string;
}

export async function googleApiRequest(accessToken: string, path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${GOOGLE_API_BASE}${path}`, {
    ...init,
    headers,
    signal: init?.signal ?? AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const reason = typeof body?.error?.errors?.[0]?.reason === "string" ? body.error.errors[0].reason : "unknown";
    console.warn("Google Calendar API request failed", { status: response.status, reason });
    throw new GoogleCalendarApiError(response.status, reason);
  }
  if (response.status === 204) return null;
  return response.json();
}

export class GoogleCalendarApiError extends Error {
  constructor(public status: number, public reason: string) {
    super("Google Calendar request failed.");
    this.name = "GoogleCalendarApiError";
  }
}

export function validGoogleCalendarEvents(value: unknown): value is GoogleCalendarEventInput[] {
  return Array.isArray(value) && value.length <= 1000 && value.every((event) => {
    if (!event || typeof event !== "object") return false;
    const item = event as Record<string, unknown>;
    return typeof item.id === "string" && item.id.length <= 100 &&
      typeof item.title === "string" && item.title.trim().length > 0 && item.title.length <= 300 &&
      typeof item.start === "string" && Number.isFinite(Date.parse(item.start)) &&
      typeof item.durationMinutes === "number" && Number.isInteger(item.durationMinutes) && item.durationMinutes >= 1 && item.durationMinutes <= 1440 &&
      ["meeting", "focus", "personal", "task", "lunch"].includes(String(item.kind));
  });
}

export function googleEventTime(event: GoogleCalendarEventInput) {
  const start = new Date(event.start);
  if (event.allDay) {
    const firstDate = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}-${String(start.getUTCDate()).padStart(2, "0")}`;
    const end = new Date(start.getTime() + event.durationMinutes * 60_000);
    const lastDate = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, "0")}-${String(end.getUTCDate()).padStart(2, "0")}`;
    return { start: { date: firstDate }, end: { date: lastDate } };
  }
  return {
    start: { dateTime: start.toISOString() },
    end: { dateTime: new Date(start.getTime() + event.durationMinutes * 60_000).toISOString() },
  };
}
