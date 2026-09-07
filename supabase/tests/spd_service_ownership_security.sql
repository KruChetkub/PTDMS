-- Security contract for 202609070010_harden_spd_service_ownership_policies.sql.
-- Safe to run in the Supabase SQL Editor; this test does not modify data.

do $block$
declare
  policy_record record;
  policy_expression text;
  insecure_policies text;
begin
  select *
  into policy_record
  from pg_policies policy
  where policy.schemaname = 'public'
    and policy.tablename = 'spd_service_ticket_timeline'
    and policy.policyname = 'spd service timeline authorized insert';

  if not found then
    raise exception 'Missing hardened timeline INSERT policy';
  end if;

  policy_expression := coalesce(policy_record.with_check, '');

  if policy_record.cmd <> 'INSERT'
    or policy_record.roles <> array['authenticated']::name[]
    or policy_expression !~ 'actor_id = auth\.uid\(\)'
    or policy_expression !~ 'spd_service_tickets'
    or policy_expression !~ 'requester_id = auth\.uid\(\)'
    or policy_expression !~ 'CREATE_TICKET'
    or policy_expression !~ 'to_status = ''NEW'''
    or policy_expression !~ 'ticket\.status = ''NEW'''
    or policy_expression !~ 'private\.is_privileged_role_impl'
  then
    raise exception 'Timeline INSERT policy does not enforce actor, ownership, state, and admin role: %',
      policy_expression;
  end if;

  select *
  into policy_record
  from pg_policies policy
  where policy.schemaname = 'public'
    and policy.tablename = 'spd_service_satisfaction_surveys'
    and policy.policyname = 'spd service surveys requester insert';

  if not found then
    raise exception 'Missing hardened satisfaction survey INSERT policy';
  end if;

  policy_expression := coalesce(policy_record.with_check, '');

  if policy_record.cmd <> 'INSERT'
    or policy_record.roles <> array['authenticated']::name[]
    or policy_expression !~ 'requester_id = auth\.uid\(\)'
    or policy_expression !~ 'spd_service_tickets'
    or policy_expression !~ 'ticket\.requester_id = auth\.uid\(\)'
    or policy_expression !~ 'ticket\.status = ''COMPLETED'''
  then
    raise exception 'Survey INSERT policy does not enforce ticket ownership and completed state: %',
      policy_expression;
  end if;

  select string_agg(
    format('%I.%I:%s', policy.schemaname, policy.tablename, policy.policyname),
    ', '
    order by policy.schemaname, policy.tablename, policy.policyname
  )
  into insecure_policies
  from pg_policies policy
  where policy.roles && array['anon', 'authenticated']::name[]
    and policy.cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    and not (
      policy.schemaname = 'public'
      and policy.tablename = 'public_visit_event_intake'
      and policy.policyname = 'public visit event intake insert'
    )
    and not (
      policy.schemaname = 'public'
      and policy.tablename = 'public_web_page_view_event_intake'
      and policy.policyname = 'public web page view event intake insert'
    )
    and concat_ws(' ', policy.qual, policy.with_check)
      !~ 'auth\.uid\(\)|private\.';

  if insecure_policies is not null then
    raise exception 'Mutation policies without a database ownership/role guard: %',
      insecure_policies;
  end if;

  if exists (
    select 1
    from pg_policies policy
    where policy.roles && array['anon', 'authenticated']::name[]
      and policy.cmd = 'INSERT'
      and policy.with_check is null
  ) then
    raise exception 'An INSERT policy is missing WITH CHECK';
  end if;

  if exists (
    select 1
    from pg_policies policy
    where policy.roles && array['anon', 'authenticated']::name[]
      and policy.cmd in ('UPDATE', 'ALL')
      and (policy.qual is null or policy.with_check is null)
  ) then
    raise exception 'An UPDATE/ALL policy is missing USING or WITH CHECK';
  end if;
end;
$block$;

select
  'PASS' as result,
  'ownership and business-role guards are enforced by RLS' as check_name;
