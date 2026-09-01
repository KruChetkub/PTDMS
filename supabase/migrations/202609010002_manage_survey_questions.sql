-- Let survey administrators atomically add, edit, remove, and reorder draft questions.

begin;

create or replace function public.save_smartdsp_survey_questions(
  target_survey_id uuid,
  submitted_questions jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]) then
    raise exception 'Only survey administrators can manage questions.' using errcode = '42501';
  end if;

  perform 1
  from public.smartdsp_surveys survey
  where survey.id = target_survey_id
  for update;

  if not found then
    raise exception 'Survey not found.' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.smartdsp_survey_responses response
    where response.survey_id = target_survey_id
  ) then
    raise exception 'Survey questions cannot be changed after the first response. Create a new survey version.'
      using errcode = '55000';
  end if;

  if submitted_questions is null or jsonb_typeof(submitted_questions) <> 'array' then
    raise exception 'Submitted questions must be an array.' using errcode = '22023';
  end if;

  if jsonb_array_length(submitted_questions) > 100 then
    raise exception 'A survey cannot contain more than 100 questions.' using errcode = '23514';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(submitted_questions) question
    where nullif(btrim(question ->> 'prompt'), '') is null
      or char_length(btrim(question ->> 'prompt')) > 1000
      or coalesce(question ->> 'question_type', '') not in ('rating_5', 'open_text')
      or (question ->> 'dimension') is not null and char_length(question ->> 'dimension') > 200
      or (question ->> 'help_text') is not null and char_length(question ->> 'help_text') > 1000
  ) then
    raise exception 'One or more survey questions are invalid.' using errcode = '23514';
  end if;

  delete from public.smartdsp_survey_questions
  where survey_id = target_survey_id;

  insert into public.smartdsp_survey_questions (
    id,
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
    (question.value ->> 'id')::uuid,
    target_survey_id,
    question.ordinality::integer,
    question.value ->> 'question_type',
    btrim(question.value ->> 'prompt'),
    nullif(btrim(question.value ->> 'dimension'), ''),
    nullif(btrim(question.value ->> 'help_text'), ''),
    coalesce((question.value ->> 'is_required')::boolean, true),
    coalesce((question.value ->> 'is_active')::boolean, true)
  from jsonb_array_elements(submitted_questions) with ordinality as question(value, ordinality);
end;
$$;

revoke all on function public.save_smartdsp_survey_questions(uuid, jsonb) from public, anon;
grant execute on function public.save_smartdsp_survey_questions(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';

commit;
