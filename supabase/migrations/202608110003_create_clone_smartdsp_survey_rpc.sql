begin;

create or replace function public.clone_smartdsp_survey(source_survey_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_survey public.smartdsp_surveys%rowtype;
  new_survey_id uuid;
  next_version integer;
begin
  if auth.uid() is null
    or not public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
  then
    raise exception 'Only administrators can create a survey round.' using errcode = '42501';
  end if;

  select *
  into source_survey
  from public.smartdsp_surveys survey
  where survey.id = source_survey_id
  for update;

  if not found then
    raise exception 'Survey not found.' using errcode = 'P0002';
  end if;

  select coalesce(max(survey.version), 0) + 1
  into next_version
  from public.smartdsp_surveys survey
  where survey.code = source_survey.code;

  insert into public.smartdsp_surveys (
    code,
    version,
    title,
    description,
    instructions,
    status,
    is_enabled,
    starts_at,
    ends_at
  ) values (
    source_survey.code,
    next_version,
    source_survey.title,
    source_survey.description,
    source_survey.instructions,
    'draft',
    false,
    null,
    null
  )
  returning id into new_survey_id;

  insert into public.smartdsp_survey_rating_options (
    survey_id,
    rating_value,
    label,
    description
  )
  select
    new_survey_id,
    option.rating_value,
    option.label,
    option.description
  from public.smartdsp_survey_rating_options option
  where option.survey_id = source_survey_id
  order by option.rating_value;

  insert into public.smartdsp_survey_questions (
    survey_id,
    position,
    question_type,
    prompt,
    dimension,
    help_text,
    is_required,
    is_active
  )
  select
    new_survey_id,
    question.position,
    question.question_type,
    question.prompt,
    question.dimension,
    question.help_text,
    question.is_required,
    question.is_active
  from public.smartdsp_survey_questions question
  where question.survey_id = source_survey_id
  order by question.position;

  return new_survey_id;
end;
$$;

revoke all on function public.clone_smartdsp_survey(uuid) from public;
revoke all on function public.clone_smartdsp_survey(uuid) from anon;
grant execute on function public.clone_smartdsp_survey(uuid) to authenticated;

commit;
