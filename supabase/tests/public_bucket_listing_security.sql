-- Security contract for 202609070013_prevent_public_bucket_listing.sql.
-- Safe to run in the Supabase SQL Editor; this test does not modify data.

do $block$
declare
  policy_record record;
begin
  if exists (
    select 1
    from pg_policies policy
    where policy.schemaname = 'storage'
      and policy.tablename = 'objects'
      and policy.cmd = 'SELECT'
      and policy.roles && array['public', 'anon']::name[]
      and coalesce(policy.qual, '') like '%site-content-assets%'
  ) then
    raise exception 'Public/anon clients can list site-content-assets';
  end if;

  select *
  into policy_record
  from pg_policies policy
  where policy.schemaname = 'storage'
    and policy.tablename = 'objects'
    and policy.policyname = 'site content assets admin read';

  if not found
    or policy_record.cmd <> 'SELECT'
    or policy_record.roles <> array['authenticated']::name[]
    or coalesce(policy_record.qual, '') not like '%site-content-assets%'
    or coalesce(policy_record.qual, '') not like '%private.is_privileged_role_impl%'
  then
    raise exception 'Admin-only site-content-assets SELECT policy is missing or unsafe';
  end if;

  if exists (
    select 1
    from pg_policies policy
    where policy.schemaname = 'storage'
      and policy.tablename = 'objects'
      and policy.cmd = 'SELECT'
      and policy.roles && array['authenticated']::name[]
      and coalesce(policy.qual, '') like '%site-content-assets%'
      and coalesce(policy.qual, '') not like '%private.is_privileged_role_impl%'
  ) then
    raise exception 'Authenticated clients have a broad bucket-listing policy';
  end if;
end;
$block$;

select
  'PASS' as result,
  'public URLs remain available without broad Storage listing access' as check_name;
