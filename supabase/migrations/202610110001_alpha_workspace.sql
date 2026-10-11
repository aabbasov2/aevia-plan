create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.create_profile_for_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users
for each row execute procedure public.create_profile_for_auth_user();
insert into public.profiles(id,display_name)
select id,coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name') from auth.users
on conflict(id) do nothing;
revoke all on function public.create_profile_for_auth_user() from public,anon,authenticated;

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  timezone text not null default 'UTC', data jsonb not null default '{}'::jsonb,
  revision bigint not null default 0 check (revision >= 0), updated_at timestamptz not null default now()
);
create table if not exists public.tasks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  id uuid not null default gen_random_uuid(), title text not null check (length(trim(title)) between 1 and 300),
  duration_minutes integer not null check (duration_minutes between 1 and 100000),
  focus_block_minutes integer check (focus_block_minutes between 1 and 180), deadline timestamptz,
  project text not null check (project in ('personal','university','work','aevia','travel')),
  notes text, source_thought_id uuid, color_index integer check (color_index between 1 and 6),
  completed boolean not null default false, recurrence jsonb not null default '{"kind":"none"}'::jsonb,
  data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists tasks_owner_deadline_idx on public.tasks(user_id, deadline) where deadline is not null;
create index if not exists tasks_owner_completed_idx on public.tasks(user_id, completed);

create table if not exists public.calendar_events (
  user_id uuid not null references public.profiles(id) on delete cascade,
  id uuid not null default gen_random_uuid(), task_id uuid,
  title text not null check (length(trim(title)) between 1 and 300), starts_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  kind text not null check (kind in ('meeting','focus','personal','task','lunch')),
  origin text check (origin in ('user','aevia')),
  project text check (project is null or project in ('personal','university','work','aevia','travel')),
  cancelled boolean not null default false, data jsonb not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint calendar_events_task_owner_fk foreign key (user_id, task_id)
    references public.tasks(user_id, id) on delete set null (task_id)
);
create index if not exists calendar_events_owner_start_idx on public.calendar_events(user_id, starts_at);
create index if not exists calendar_events_owner_task_idx on public.calendar_events(user_id, task_id) where task_id is not null;

create table if not exists public.commitments (
  user_id uuid not null references public.profiles(id) on delete cascade,
  id uuid not null default gen_random_uuid(), title text not null check (length(trim(title)) between 1 and 300),
  cadence jsonb not null, project text not null check (project in ('personal','university','work','aevia','travel')),
  data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.thoughts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  id uuid not null default gen_random_uuid(), content text not null check (length(trim(content)) between 1 and 10000),
  category text not null default 'thought' check (category in ('task','note','idea','thought')),
  status text not null check (status in ('unprocessed','later','converted','dismissed')),
  captured_at timestamptz not null, data jsonb not null, primary key (user_id, id)
);
create index if not exists thoughts_owner_status_time_idx on public.thoughts(user_id, status, captured_at desc);

create table if not exists public.inbox_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  id uuid not null default gen_random_uuid(), source text not null,
  title text not null check (length(trim(title)) between 1 and 300),
  status text not null default 'unprocessed', received_at timestamptz not null default now(),
  data jsonb not null, primary key (user_id, id)
);

create table if not exists public.focus_sessions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  id uuid not null, task_id uuid, kind text not null check (kind in ('focus','break')),
  status text not null check (status in ('running','paused','completed','ended')),
  started_at timestamptz not null, intended_duration_minutes integer not null check (intended_duration_minutes between 1 and 180),
  is_active boolean not null default false, data jsonb not null, primary key (user_id, id),
  constraint focus_sessions_task_owner_fk foreign key (user_id, task_id)
    references public.tasks(user_id, id) on delete set null (task_id)
);
create unique index if not exists focus_one_active_per_owner_idx on public.focus_sessions(user_id) where is_active;

create table if not exists public.captured_distractions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  id uuid not null, focus_session_id uuid, captured_at timestamptz not null,
  data jsonb not null, primary key (user_id, id),
  constraint captured_distractions_session_owner_fk foreign key (user_id, focus_session_id)
    references public.focus_sessions(user_id, id) on delete set null (focus_session_id)
);

create table if not exists public.alpha_feedback (
  user_id uuid not null references public.profiles(id) on delete cascade,
  id uuid not null default gen_random_uuid(), category text not null check (category in ('bug','idea','other')),
  message text not null check (length(trim(message)) between 1 and 5000),
  created_at timestamptz not null default now(), primary key (user_id, id)
);

do $$ declare table_name text;
begin
  foreach table_name in array array['profiles','user_preferences','tasks','calendar_events','commitments','thoughts','inbox_items','focus_sessions','captured_distractions','alpha_feedback'] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;
drop policy if exists "users manage own profile" on public.profiles;
create policy "users manage own profile" on public.profiles for all to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
do $$ declare table_name text;
begin
  foreach table_name in array array['user_preferences','tasks','calendar_events','commitments','thoughts','inbox_items','focus_sessions','captured_distractions','alpha_feedback'] loop
    execute format('drop policy if exists "users manage own rows" on public.%I', table_name);
    execute format('create policy "users manage own rows" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name);
  end loop;
end $$;
grant usage on schema public to authenticated;
revoke all on public.profiles,public.user_preferences,public.tasks,public.calendar_events,public.commitments,public.thoughts,public.inbox_items,public.focus_sessions,public.captured_distractions,public.alpha_feedback from anon,public;
grant select,insert,update,delete on public.profiles,public.tasks,public.calendar_events,public.commitments,public.thoughts,public.inbox_items,public.focus_sessions,public.captured_distractions,public.alpha_feedback to authenticated;
grant select on public.user_preferences to authenticated;

create or replace function public.load_aevia_workspace()
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid(); revision_value bigint; prefs jsonb; tasks_value jsonb;
declare events_value jsonb; commitments_value jsonb; thoughts_value jsonb; inbox_value jsonb;
declare active_focus_value jsonb; focus_history_value jsonb;
begin
  if owner_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select revision,data into revision_value,prefs from public.user_preferences where user_id = owner_id;
  select coalesce(jsonb_agg(data),'[]'::jsonb) into tasks_value from public.tasks where user_id = owner_id;
  select coalesce(jsonb_agg(data),'[]'::jsonb) into events_value from public.calendar_events where user_id = owner_id;
  select coalesce(jsonb_agg(data),'[]'::jsonb) into commitments_value from public.commitments where user_id = owner_id;
  select coalesce(jsonb_agg(data order by captured_at desc),'[]'::jsonb) into thoughts_value from public.thoughts where user_id = owner_id;
  select coalesce(jsonb_agg(data order by received_at desc),'[]'::jsonb) into inbox_value from public.inbox_items where user_id = owner_id;
  select data into active_focus_value from public.focus_sessions where user_id = owner_id and is_active limit 1;
  select coalesce(jsonb_agg(data order by started_at desc),'[]'::jsonb) into focus_history_value from public.focus_sessions where user_id = owner_id and not is_active;
  return jsonb_build_object(
    'revision',coalesce(revision_value,0), 'has_workspace',prefs is not null,
    'state',case when prefs is null then null else jsonb_build_object(
      'tasks',coalesce(tasks_value,'[]'::jsonb),'events',coalesce(events_value,'[]'::jsonb),
      'commitments',coalesce(commitments_value,'[]'::jsonb),
      'plannerPreferences',coalesce(prefs->'plannerPreferences','{}'::jsonb),
      'todayBackground',coalesce(prefs->'todayBackground','"mountains"'::jsonb),
      'focusSession',active_focus_value,'focusHistory',coalesce(focus_history_value,'[]'::jsonb),
      'capturedDistractions',coalesce(thoughts_value,'[]'::jsonb),'inboxItems',coalesce(inbox_value,'[]'::jsonb)
    ) end
  );
end;
$$;

create or replace function public.save_aevia_workspace(p_state jsonb,p_expected_revision bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); current_revision bigint; next_revision bigint; x jsonb;
begin
  if owner_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if jsonb_typeof(p_state) <> 'object' then raise exception 'invalid workspace data' using errcode = '22023'; end if;
  insert into public.user_preferences(user_id,revision,data,timezone)
  values(owner_id,0,'{}'::jsonb,coalesce(p_state#>>'{plannerPreferences,timezone}','UTC')) on conflict(user_id) do nothing;
  select revision into current_revision from public.user_preferences where user_id=owner_id for update;
  if current_revision <> p_expected_revision then raise exception 'workspace conflict' using errcode = '40001'; end if;

  delete from public.calendar_events where user_id=owner_id;
  delete from public.captured_distractions where user_id=owner_id;
  delete from public.focus_sessions where user_id=owner_id;
  delete from public.thoughts where user_id=owner_id;
  delete from public.tasks where user_id=owner_id;
  delete from public.commitments where user_id=owner_id;
  delete from public.inbox_items where user_id=owner_id;

  for x in select value from jsonb_array_elements(coalesce(p_state->'capturedDistractions','[]'::jsonb)) loop
    insert into public.thoughts(user_id,id,content,category,status,captured_at,data)
    values(owner_id,(x->>'id')::uuid,left(coalesce(x->>'text',''),10000),coalesce(x->>'category','thought'),x->>'status',to_timestamp((x->>'createdAt')::double precision/1000),x);
  end loop;
  for x in select value from jsonb_array_elements(coalesce(p_state->'tasks','[]'::jsonb)) loop
  insert into public.tasks(user_id,id,title,duration_minutes,focus_block_minutes,deadline,project,notes,source_thought_id,color_index,completed,recurrence,data)
    values(owner_id,(x->>'id')::uuid,x->>'title',(x->>'durationMinutes')::integer,nullif(x->>'focusBlockMinutes','')::integer,nullif(x->>'deadline','')::timestamptz,x->>'project',x->>'notes',nullif(x->>'sourceDistractionId','')::uuid,nullif(x->>'colorIndex','')::integer,coalesce((x->>'completed')::boolean,false),coalesce(x->'recurrence','{"kind":"none"}'::jsonb),x);
  end loop;
  for x in select value from jsonb_array_elements(coalesce(p_state->'events','[]'::jsonb)) loop
    insert into public.calendar_events(user_id,id,task_id,title,starts_at,duration_minutes,kind,origin,project,cancelled,data)
    values(owner_id,(x->>'id')::uuid,nullif(x->>'taskId','')::uuid,x->>'title',(x->>'start')::timestamptz,(x->>'durationMinutes')::integer,x->>'kind',x->>'origin',x->>'project',coalesce((x->>'cancelled')::boolean,false),x);
  end loop;
  for x in select value from jsonb_array_elements(coalesce(p_state->'commitments','[]'::jsonb)) loop
    insert into public.commitments(user_id,id,title,cadence,project,data)
    values(owner_id,(x->>'id')::uuid,x->>'title',x->'cadence',x->>'project',x);
  end loop;
  if jsonb_typeof(p_state->'focusSession')='object' then
    x:=p_state->'focusSession';
    insert into public.focus_sessions(user_id,id,task_id,kind,status,started_at,intended_duration_minutes,is_active,data)
    values(owner_id,(x->>'id')::uuid,nullif(x->>'taskId','')::uuid,x->>'kind',x->>'status',to_timestamp((x->>'startedAt')::double precision/1000),(x->>'durationMinutes')::integer,(x->>'status') in ('running','paused'),x);
  end if;
  for x in select value from jsonb_array_elements(coalesce(p_state->'focusHistory','[]'::jsonb)) loop
    if x->>'id' is distinct from p_state->'focusSession'->>'id' then
      insert into public.focus_sessions(user_id,id,task_id,kind,status,started_at,intended_duration_minutes,is_active,data)
      values(owner_id,(x->>'id')::uuid,nullif(x->>'taskId','')::uuid,x->>'kind',x->>'status',to_timestamp((x->>'startedAt')::double precision/1000),(x->>'durationMinutes')::integer,false,x)
      on conflict(user_id,id) do nothing;
    end if;
  end loop;
  for x in select value from jsonb_array_elements(coalesce(p_state->'capturedDistractions','[]'::jsonb)) loop
    if nullif(x->>'sessionId','') is not null then
      insert into public.captured_distractions(user_id,id,focus_session_id,captured_at,data)
      values(owner_id,(x->>'id')::uuid,(x->>'sessionId')::uuid,to_timestamp((x->>'createdAt')::double precision/1000),x);
    end if;
  end loop;
  for x in select value from jsonb_array_elements(coalesce(p_state->'inboxItems','[]'::jsonb)) loop
    insert into public.inbox_items(user_id,id,source,title,status,received_at,data)
    values(owner_id,(x->>'id')::uuid,x->>'source',x->>'title',coalesce(x->>'status','unprocessed'),coalesce((x->>'receivedAt')::timestamptz,now()),x);
  end loop;
  next_revision:=current_revision+1;
  update public.user_preferences set revision=next_revision,
    data=jsonb_build_object('plannerPreferences',coalesce(p_state->'plannerPreferences','{}'::jsonb),'todayBackground',coalesce(p_state->'todayBackground','"mountains"'::jsonb)),
    timezone=coalesce(p_state#>>'{plannerPreferences,timezone}',timezone),updated_at=now() where user_id=owner_id;
  update public.profiles set timezone=coalesce(p_state#>>'{plannerPreferences,timezone}',timezone),updated_at=now() where id=owner_id;
  return next_revision;
end;
$$;

revoke all on function public.load_aevia_workspace() from public,anon;
revoke all on function public.save_aevia_workspace(jsonb,bigint) from public,anon;
grant execute on function public.load_aevia_workspace() to authenticated;
grant execute on function public.save_aevia_workspace(jsonb,bigint) to authenticated;
