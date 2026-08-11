-- Transactional test for respondent context and permanent-delete authorization.
-- All records, including the audit record, are rolled back.

begin;

update public.smartdsp_surveys
set status = 'active', is_enabled = true
where code = 'smartdsp-satisfaction'
  and version = 1;

select set_config(
  'request.jwt.claim.sub',
  (
    select user_id::text from public.profiles
    where status = 'active' and role not in ('super_admin', 'admin')
    order by created_at limit 1
  ),
  true
);

set local role authenticated;

select set_config(
  'test.smartdsp_response_id',
  public.submit_smartdsp_survey_with_context(
    (select id from public.smartdsp_surveys where code = 'smartdsp-satisfaction' and version = 1),
    (
      select jsonb_agg(jsonb_build_object('question_id', question.id, 'rating_value', 4) order by question.position)
      from public.smartdsp_survey_questions question
      where question.survey_id = (select id from public.smartdsp_surveys where code = 'smartdsp-satisfaction' and version = 1)
        and question.question_type = 'rating_5'
        and question.is_active = true
    ),
    jsonb_build_object(
      'respondent_role', 'general_user',
      'usage_frequency', 'weekly',
      'used_services', jsonb_build_array('public_home_search', 'service_requests')
    )
  )::text,
  true
);

reset role;

do $test$
begin
  if not exists (
    select 1 from public.smartdsp_survey_respondent_contexts context
    where context.response_id = current_setting('test.smartdsp_response_id')::uuid
      and context.respondent_role = 'general_user'
      and context.usage_frequency = 'weekly'
  ) then
    raise exception 'Context test failed: respondent context was not stored.';
  end if;
end;
$test$;

select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from public.profiles where status = 'active' and role = 'admin' order by created_at limit 1),
  true
);

set local role authenticated;

do $test$
begin
  begin
    perform public.delete_smartdsp_survey_response(current_setting('test.smartdsp_response_id')::uuid);
    raise exception 'Delete authorization test failed: admin deleted a response.';
  exception
    when insufficient_privilege then null;
  end;
end;
$test$;

reset role;

select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from public.profiles where status = 'active' and role = 'super_admin' order by created_at limit 1),
  true
);

set local role authenticated;
select public.delete_smartdsp_survey_response(current_setting('test.smartdsp_response_id')::uuid);
reset role;

do $test$
begin
  if exists (
    select 1 from public.smartdsp_survey_responses response
    where response.id = current_setting('test.smartdsp_response_id')::uuid
  ) then
    raise exception 'Delete test failed: response remains after super admin deletion.';
  end if;

  if not exists (
    select 1 from public.audit_logs log
    where log.action = 'smartdsp_survey_response_delete'
      and log.resource_id = current_setting('test.smartdsp_response_id')
  ) then
    raise exception 'Delete test failed: audit log was not created.';
  end if;
end;
$test$;

rollback;
