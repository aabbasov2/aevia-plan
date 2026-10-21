create table if not exists public.google_calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_email text not null,
  refresh_token_ciphertext text not null,
  token_scope text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_calendar_connections enable row level security;
revoke all on public.google_calendar_connections from anon, authenticated, public;
grant select, insert, update, delete on public.google_calendar_connections to service_role;
