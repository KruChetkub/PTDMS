-- Transactional smoke test for the SmartDSP satisfaction survey.
-- Safe for a linked test run because every change is rolled back.

begin;

update public.smartdsp_surveys
set status = 'active', is_enabled = true
where code = 'smartdsp-satisfaction'
  and version = 1;

select set_config(
  'request.jwt.claim.sub',
  (
    select user_id::text
    from public.profiles
    where status = 'active'
      and role not in ('super_admin', 'admin')
    order by created_at
    limit 1
  ),
  true
);

set local role authenticated;

do $test$
declare
  target_survey_id uuid;
  test_answers jsonb;
  first_response_id uuid;
  own_response_count integer;
begin
  select id
  into target_survey_id
  from public.smartdsp_surveys
  where code = 'smartdsp-satisfaction'
    and version = 1;

  select jsonb_agg(
    jsonb_build_object(
      'question_id', question.id,
      'rating_value', 5
    )
    order by question.position
  )
  into test_answers
  from public.smartdsp_survey_questions question
  where question.survey_id = target_survey_id
    and question.question_type = 'rating_5'
    and question.is_active = true;

  first_response_id := public.submit_smartdsp_survey(target_survey_id, test_answers);

  select count(*)
  into own_response_count
  from public.smartdsp_survey_responses response
  where response.id = first_response_id
    and response.respondent_id = auth.uid();

  if own_response_count <> 1 then
    raise exception 'RLS test failed: the respondent cannot read the submitted response.';
  end if;

  begin
    perform public.submit_smartdsp_survey(target_survey_id, test_answers);
    raise exception 'Uniqueness test failed: a second response was accepted.';
  exception
    when unique_violation then null;
  end;
end;
$test$;

rollback;
