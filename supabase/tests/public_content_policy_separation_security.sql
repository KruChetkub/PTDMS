-- Security contract for 202609070006_split_public_and_admin_read_policies.sql.
-- Safe to run in the Supabase SQL Editor; this test does not modify data.

do $block$
declare
  target record;
  public_policy record;
  admin_policy record;
begin
  for target in
    select *
    from (values
      ('public_home_content_items', 'home content public read published', 'home content admin read all'),
      ('public_performance_results', 'performance results public read published', 'performance results admin read all'),
      ('public_repository_categories', 'repository categories public read active', 'repository categories admin read all'),
      ('public_research_items', 'research items public read published', 'research items admin read all'),
      ('public_user_plans', 'public user plans public read published', 'public user plans admin read all'),
      ('public_web_page_items', 'public web page items public read published', 'public web page items admin read all'),
      ('public_web_pages', 'public web pages public read published', 'public web pages admin read all')
    ) policy_target(table_name, public_policy_name, admin_policy_name)
  loop
    select *
    into public_policy
    from pg_policies policy
    where policy.schemaname = 'public'
      and policy.tablename = target.table_name
      and policy.policyname = target.public_policy_name;

    if not found then
      raise exception 'Missing public read policy %.%', target.table_name, target.public_policy_name;
    end if;

    if public_policy.cmd <> 'SELECT'
      or not (
        public_policy.roles @> array['anon', 'authenticated']::name[]
      )
      or cardinality(public_policy.roles) <> 2
      or public_policy.qual is null
      or public_policy.qual ~ 'is_privileged_role|has_permission|current_user_role'
    then
      raise exception 'Unsafe public read policy %.%: roles=%, cmd=%, qual=%',
        target.table_name,
        target.public_policy_name,
        public_policy.roles,
        public_policy.cmd,
        public_policy.qual;
    end if;

    select *
    into admin_policy
    from pg_policies policy
    where policy.schemaname = 'public'
      and policy.tablename = target.table_name
      and policy.policyname = target.admin_policy_name;

    if not found then
      raise exception 'Missing admin read policy %.%', target.table_name, target.admin_policy_name;
    end if;

    if admin_policy.cmd <> 'SELECT'
      or admin_policy.roles <> array['authenticated']::name[]
      or admin_policy.qual !~ 'private\.is_privileged_role_impl'
    then
      raise exception 'Unsafe admin read policy %.%: roles=%, cmd=%, qual=%',
        target.table_name,
        target.admin_policy_name,
        admin_policy.roles,
        admin_policy.cmd,
        admin_policy.qual;
    end if;
  end loop;

  if exists (
    select 1
    from pg_policies policy
    where policy.schemaname = 'public'
      and policy.roles @> array['anon']::name[]
      and concat_ws(' ', policy.qual, policy.with_check) ~ 'private\.'
  ) then
    raise exception 'An anon policy still invokes a private-schema helper';
  end if;
end;
$block$;

select
  'PASS' as result,
  'public/admin SELECT policies are separated for all 7 tables' as check_name;
