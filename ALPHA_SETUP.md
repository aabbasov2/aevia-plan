# Aevia private alpha setup

This app uses Supabase Auth and Postgres. The browser receives only the Supabase project URL and publishable key. The database derives row ownership from the verified Supabase session; no service-role key is used by the app.

## Supabase project setup

1. Create a Supabase project for the alpha.
2. Apply `supabase/migrations/202610110001_alpha_workspace.sql` in the Supabase SQL Editor, or link this repository to the project and run `supabase db push`. The migration creates the profile trigger, planner tables, ownership policies, and atomic workspace read/write functions. It does not remove existing rows.
3. In **Authentication → Providers → Email**, enable email/password sign-in. In **Authentication → Settings**, turn **Allow new users to sign up** off. There is no sign-up form or account-creation route in Aevia. Supabase’s hosted setting is authoritative; `supabase/config.toml` also disables signup for local Supabase development.
4. In **Authentication → Settings → Password security**, set the password policy and enable **Require current password when changing password**. The password page sends Supabase’s `current_password` field and keeps the user signed in after success.
5. Set the project’s Site URL to the Aevia origin. Add each local and Vercel alpha URL to the allowed redirect/site URL list. Aevia itself uses email/password and does not send password-reset redirects.
6. In the Supabase dashboard, create the two users manually. Use a different randomly generated temporary password for each person, share it through a private channel, and ask them to change it immediately after signing in at **Account settings → Change password**. Supabase does not provide a built-in “must change password on next sign-in” flag for this flow, so this first change is a manual alpha procedure. If someone loses access, reset their password manually in the Supabase dashboard; public recovery is intentionally not implemented.
7. Confirm that the `on_auth_user_created_profile` trigger is installed. It creates a profile for dashboard-provisioned users; it does not create Auth users.

## Local and Vercel environment

Copy `.env.example` to `.env.local` and fill in the URL and publishable key from the Supabase project’s Connect dialog. Keep `GROQ_API_KEY` server-only. Do not add a service-role key to the application, a `NEXT_PUBLIC_` variable, or the repository.

Add these environment variables to both **Preview** and **Production** in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `GROQ_API_KEY` (for Aevia AI in that deployment)

Use the same Supabase project for the two-founder alpha’s Preview and Production URLs only if both deployments are intended to show the same plan. Otherwise create separate Supabase projects and apply the migration to each.

## Existing browser data

The old Aevia state was global to a browser and included sample tasks and events. The new database starts empty for each account. On the first sign-in from a browser with old local data, Aevia asks whether to import that data into the account. Import only if it belongs to that founder. If a different account has already used that browser, the app starts the new account with a clean plan instead of offering the previous account’s local data. Inbox records remain a separate table from Thoughts.

## Verification before inviting the founders

1. Add the Supabase variables locally and apply the migration.
2. Sign in as each provisioned user in separate browser profiles. Confirm each starts with a private empty plan.
3. As user A, add and edit tasks, schedule them, move calendar events, add commitments, capture thoughts, and run/finish a focus session. Refresh and restart the browser; confirm the data and remaining focus time are restored.
4. Sign in as user B and confirm user A’s records are absent. Try direct table reads and updates using user A’s record UUID while authenticated as user B; RLS must return no rows or reject the write.
5. Attempt a public Auth signup through Supabase’s `/auth/v1/signup` endpoint using a unique test address on a non-production project. It must be rejected after public signup is disabled. If it succeeds, stop and disable signup before continuing; remove any test user it created.
6. Change each test user’s password using the current password, then sign in again with the new password. Confirm a wrong current password fails and the user remains signed in after a successful change.
7. Repeat the account separation and persistence checks on a second device for the same user.

For repeatable Auth and Row-Level Security checks, set `ALPHA_USER_A_EMAIL`, `ALPHA_USER_A_PASSWORD`, `ALPHA_USER_B_EMAIL`, and `ALPHA_USER_B_PASSWORD` in the local shell, then run `npm run test:alpha-security`. This test creates and removes a temporary task under user A and makes a one-off signup probe. Run it only against a non-production alpha/staging project; if signup is accidentally enabled, the script reports the test user that must be deleted.

The application build can be checked locally before the project is configured. Hosted authentication, the SQL migration, direct signup rejection, cross-account RLS, and multi-device persistence are not verified until these steps run against the actual Supabase project.
