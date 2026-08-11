begin;

create or replace function public.complete_smartdsp_survey_respondent_context(
  target_response_id uuid,
  respondent_context jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  selected_role text;
  selected_role_other text;
  selected_frequency text;
  selected_services text[];
  selected_services_other text;
  allowed_services constant text[] := array[
    'public_home_search', 'strategy_plans', 'performance_results', 'r2r_research',
    'personnel_profile', 'training_records', 'service_requests', 'meeting_resources',
    'reports_dashboard', 'site_admin', 'other'
  ];
begin
  if actor_id is null or not exists (
    select 1 from public.smartdsp_survey_responses response
    where response.id = target_response_id and response.respondent_id = actor_id
  ) then
    raise exception 'Only the response owner can complete respondent context.' using errcode = '42501';
  end if;

  if exists (select 1 from public.smartdsp_survey_respondent_contexts context where context.response_id = target_response_id) then
    raise exception 'Respondent context has already been completed.' using errcode = '23505';
  end if;

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

  insert into public.smartdsp_survey_respondent_contexts (
    response_id, respondent_role, respondent_role_other, usage_frequency, used_services, used_services_other
  ) values (
    target_response_id, selected_role, selected_role_other, selected_frequency, selected_services, selected_services_other
  );
end;
$$;

revoke all on function public.complete_smartdsp_survey_respondent_context(uuid, jsonb) from public, anon;
grant execute on function public.complete_smartdsp_survey_respondent_context(uuid, jsonb) to authenticated;

commit;
