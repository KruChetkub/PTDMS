begin;

create table if not exists public.smartdsp_survey_respondent_contexts (
  response_id uuid primary key references public.smartdsp_survey_responses(id) on delete cascade,
  respondent_role text not null check (respondent_role in ('executive', 'general_user', 'data_editor', 'reviewer', 'system_admin', 'other')),
  respondent_role_other text,
  usage_frequency text not null check (usage_frequency in ('daily', 'several_weekly', 'weekly', 'several_monthly', 'rarely')),
  used_services text[] not null check (cardinality(used_services) > 0),
  used_services_other text,
  created_at timestamptz not null default now(),
  constraint smartdsp_survey_role_other_required check (
    (respondent_role = 'other' and char_length(btrim(coalesce(respondent_role_other, ''))) between 1 and 500)
    or (respondent_role <> 'other' and respondent_role_other is null)
  ),
  constraint smartdsp_survey_service_other_required check (
    ('other' = any(used_services) and char_length(btrim(coalesce(used_services_other, ''))) between 1 and 500)
    or (not ('other' = any(used_services)) and used_services_other is null)
  )
);

alter table public.smartdsp_survey_respondent_contexts enable row level security;

drop policy if exists "smartdsp survey context respondent or admin read" on public.smartdsp_survey_respondent_contexts;
create policy "smartdsp survey context respondent or admin read"
on public.smartdsp_survey_respondent_contexts
for select
to authenticated
using (
  exists (
    select 1
    from public.smartdsp_survey_responses response
    where response.id = smartdsp_survey_respondent_contexts.response_id
      and response.respondent_id = auth.uid()
  )
  or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

revoke all on public.smartdsp_survey_respondent_contexts from public, anon, authenticated;
grant select on public.smartdsp_survey_respondent_contexts to authenticated;

create or replace function public.submit_smartdsp_survey_with_context(
  target_survey_id uuid,
  submitted_answers jsonb,
  respondent_context jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  response_id uuid;
  selected_role text;
  selected_role_other text;
  selected_frequency text;
  selected_services text[];
  selected_services_other text;
  allowed_services constant text[] := array[
    'public_home_search',
    'strategy_plans',
    'performance_results',
    'r2r_research',
    'personnel_profile',
    'training_records',
    'service_requests',
    'meeting_resources',
    'reports_dashboard',
    'site_admin',
    'other'
  ];
begin
  if respondent_context is null or jsonb_typeof(respondent_context) <> 'object' then
    raise exception 'Respondent context is required.' using errcode = '22023';
  end if;

  selected_role := respondent_context ->> 'respondent_role';
  selected_role_other := nullif(btrim(respondent_context ->> 'respondent_role_other'), '');
  selected_frequency := respondent_context ->> 'usage_frequency';
  selected_services_other := nullif(btrim(respondent_context ->> 'used_services_other'), '');

  if selected_role is null or selected_role not in ('executive', 'general_user', 'data_editor', 'reviewer', 'system_admin', 'other') then
    raise exception 'Invalid respondent role.' using errcode = '23514';
  end if;

  if selected_role = 'other' and (selected_role_other is null or char_length(selected_role_other) > 500) then
    raise exception 'Other respondent role is required and must not exceed 500 characters.' using errcode = '23514';
  end if;
  if selected_role <> 'other' then selected_role_other := null; end if;

  if selected_frequency is null or selected_frequency not in ('daily', 'several_weekly', 'weekly', 'several_monthly', 'rarely') then
    raise exception 'Invalid usage frequency.' using errcode = '23514';
  end if;

  if jsonb_typeof(respondent_context -> 'used_services') <> 'array' then
    raise exception 'Used services must be an array.' using errcode = '22023';
  end if;

  select array_agg(distinct service order by service)
  into selected_services
  from jsonb_array_elements_text(respondent_context -> 'used_services') service;

  if coalesce(cardinality(selected_services), 0) = 0
    or exists (select 1 from unnest(selected_services) service where not (service = any(allowed_services)))
  then
    raise exception 'Invalid used services.' using errcode = '23514';
  end if;

  if 'other' = any(selected_services) and (selected_services_other is null or char_length(selected_services_other) > 500) then
    raise exception 'Other used service is required and must not exceed 500 characters.' using errcode = '23514';
  end if;
  if not ('other' = any(selected_services)) then selected_services_other := null; end if;

  response_id := public.submit_smartdsp_survey(target_survey_id, submitted_answers);

  insert into public.smartdsp_survey_respondent_contexts (
    response_id,
    respondent_role,
    respondent_role_other,
    usage_frequency,
    used_services,
    used_services_other
  ) values (
    response_id,
    selected_role,
    selected_role_other,
    selected_frequency,
    selected_services,
    selected_services_other
  );

  return response_id;
end;
$$;

create or replace function public.delete_smartdsp_survey_response(target_response_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_response public.smartdsp_survey_responses%rowtype;
begin
  if auth.uid() is null
    or not public.is_privileged_role(array['super_admin']::public.user_role[])
  then
    raise exception 'Only super administrators can permanently delete survey responses.' using errcode = '42501';
  end if;

  select *
  into target_response
  from public.smartdsp_survey_responses response
  where response.id = target_response_id
  for update;

  if not found then
    raise exception 'Survey response not found.' using errcode = 'P0002';
  end if;

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (
    auth.uid(),
    'smartdsp_survey_response_delete',
    'smartdsp_survey_response',
    target_response.id::text,
    jsonb_build_object(
      'survey_id', target_response.survey_id,
      'respondent_id', target_response.respondent_id,
      'submitted_at', target_response.submitted_at
    )
  );

  delete from public.smartdsp_survey_responses response
  where response.id = target_response_id;
end;
$$;

revoke all on function public.submit_smartdsp_survey(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.submit_smartdsp_survey_with_context(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.submit_smartdsp_survey_with_context(uuid, jsonb, jsonb) to authenticated;

revoke all on function public.delete_smartdsp_survey_response(uuid) from public, anon;
grant execute on function public.delete_smartdsp_survey_response(uuid) to authenticated;

commit;
