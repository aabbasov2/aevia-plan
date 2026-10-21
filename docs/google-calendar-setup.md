# Google Calendar setup

Google Calendar authorization is handled by Aevia's server. OAuth tokens are encrypted before they are saved; they are never returned to the browser. The app requests `calendar.events` so it can read and write calendar events, plus OpenID/email to identify the connected Google account.

## Google Cloud

1. Create or select a Google Cloud project and enable the **Google Calendar API**.
2. Configure the OAuth consent screen. Add the app name, support email, and authorized domains. While the consent screen is in Testing, add the Google accounts that will test the integration as test users. Google may require verification before an external app can request the Calendar scope from general users.
3. Create an OAuth client ID of type **Web application**.
4. Add an authorized redirect URI that exactly matches the app's `GOOGLE_CALENDAR_REDIRECT_URI`, for example `http://localhost:3001/api/google-calendar/callback` in the current local production preview. Add the exact production callback URL separately when deploying.

## Server environment

Set these in the local `.env.local` and in the deployment's server environment. Do not prefix them with `NEXT_PUBLIC_`.

```env
GOOGLE_CLIENT_ID=your-web-client-id
GOOGLE_CLIENT_SECRET=your-web-client-secret
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3001/api/google-calendar/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=base64-encoded-32-byte-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

Generate an encryption key with:

```sh
openssl rand -base64 32
```

Apply `supabase/migrations/202610180002_google_calendar_connections.sql` to the Supabase project before connecting an account. Restart the app after setting environment variables.

## Sync behavior

Sync starts manually from the Calendar toolbar. It writes Aevia calendar events into the connected account's primary calendar and imports events from the last 30 days through the next 365 days. Imported items appear as calendar events and are locked to avoid accidental planner movement. Existing Google events are updated by their stored Google event ID. Cancelling a linked Aevia event cancels the Google event. Disconnecting revokes the Google token when possible and removes Aevia's encrypted token record; it leaves previously imported Aevia calendar items in the workspace.
