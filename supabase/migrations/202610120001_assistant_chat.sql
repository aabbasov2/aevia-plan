create table if not exists public.assistant_messages (
  user_id uuid not null references public.profiles(id) on delete cascade,
  id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (length(trim(content)) between 1 and 2000),
  created_at timestamptz not null,
  primary key (user_id, id)
);

create index if not exists assistant_messages_owner_created_idx
  on public.assistant_messages(user_id, created_at);

alter table public.assistant_messages enable row level security;
drop policy if exists "users manage own assistant messages" on public.assistant_messages;
create policy "users manage own assistant messages" on public.assistant_messages
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.assistant_messages from anon, public;
grant select, insert, update, delete on public.assistant_messages to authenticated;
