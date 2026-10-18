-- Workspace revision mismatches are expected concurrency signals, not database
-- failures. Return a negative revision marker so clients can reload and rebase
-- without emitting a Postgres ERROR for every conflict.
create or replace function public.save_aevia_workspace(p_state jsonb,p_expected_revision bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); current_revision bigint; next_revision bigint; x jsonb;
begin
  if owner_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if jsonb_typeof(p_state) <> 'object' then raise exception 'invalid workspace data' using errcode = '22023'; end if;
  insert into public.user_preferences(user_id,revision,data,timezone)
  values(owner_id,0,'{}'::jsonb,coalesce(p_state#>>'{plannerPreferences,timezone}','UTC')) on conflict(user_id) do nothing;
  select revision into current_revision from public.user_preferences where user_id=owner_id for update;
  if current_revision <> p_expected_revision then return -(current_revision + 1); end if;

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

revoke all on function public.save_aevia_workspace(jsonb,bigint) from public,anon;
grant execute on function public.save_aevia_workspace(jsonb,bigint) to authenticated;
