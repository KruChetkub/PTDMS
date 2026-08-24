-- Allow only super administrators to clear responses while preserving the survey template.

begin;

drop policy if exists "smartdsp surveys admin manage" on public.smartdsp_surveys;
drop policy if exists "smartdsp surveys admin insert" on public.smartdsp_surveys;
drop policy if exists "smartdsp surveys admin update" on public.smartdsp_surveys;
drop policy if exists "smartdsp surveys super admin delete" on public.smartdsp_surveys;

create policy "smartdsp surveys admin insert"
on public.smartdsp_surveys
for insert
to authenticated
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

create policy "smartdsp surveys admin update"
on public.smartdsp_surveys
for update
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

revoke delete on public.smartdsp_surveys from authenticated;

create or replace function public.clear_smartdsp_survey_round_data(target_survey_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_survey public.smartdsp_surveys%rowtype;
  response_count integer;
begin
  if auth.uid() is null
    or not public.is_privileged_role(array['super_admin']::public.user_role[])
  then
    raise exception 'Only super administrators can clear survey round data.' using errcode = '42501';
  end if;

  select *
  into target_survey
  from public.smartdsp_surveys survey
  where survey.id = target_survey_id
  for update;

  if not found then
    raise exception 'Survey round not found.' using errcode = 'P0002';
  end if;

  select count(*)::integer
  into response_count
  from public.smartdsp_survey_responses response
  where response.survey_id = target_survey.id;

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (
    auth.uid(),
    'smartdsp_survey_round_data_clear',
    'smartdsp_survey',
    target_survey.id::text,
    jsonb_build_object(
      'code', target_survey.code,
      'version', target_survey.version,
      'title', target_survey.title,
      'status', target_survey.status,
      'is_enabled', target_survey.is_enabled,
      'response_count', response_count
    )
  );

  -- Consent rows can exist before a response is submitted, so remove them first.
  delete from public.smartdsp_survey_consents consent
  where consent.survey_id = target_survey.id;

  -- Answers and respondent contexts cascade from each response.
  delete from public.smartdsp_survey_responses response
  where response.survey_id = target_survey.id;

end;
$$;

revoke all on function public.clear_smartdsp_survey_round_data(uuid) from public, anon;
grant execute on function public.clear_smartdsp_survey_round_data(uuid) to authenticated;

commit;
