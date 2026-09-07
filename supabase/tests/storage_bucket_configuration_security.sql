-- Security Hardening Plan 1.9: Storage bucket configuration contract.
-- Safe to run in the Supabase SQL Editor; this test does not modify data.

do $block$
declare
  unexpected_buckets text;
begin
  if not exists (
    select 1 from storage.buckets
    where id = 'site-content-assets'
      and public is true
      and file_size_limit = 52428800
  ) then
    raise exception 'site-content-assets must be public with a 50 MB limit';
  end if;

  if not exists (
    select 1 from storage.buckets
    where id = 'spd-assistant-imports'
      and public is false
      and file_size_limit = 5242880
  ) then
    raise exception 'spd-assistant-imports must be private with a 5 MB limit';
  end if;

  if not exists (
    select 1 from storage.buckets
    where id = 'spd-service-request-guides'
      and public is false
      and file_size_limit = 5242880
  ) then
    raise exception 'spd-service-request-guides must be private with a 5 MB limit';
  end if;

  select string_agg(id, ', ' order by id)
  into unexpected_buckets
  from storage.buckets
  where id not in (
    'site-content-assets',
    'spd-assistant-imports',
    'spd-service-request-guides'
  );

  if unexpected_buckets is not null then
    raise exception 'Unreviewed Storage buckets found: %', unexpected_buckets;
  end if;
end;
$block$;

select
  'PASS' as result,
  'Storage bucket visibility and size limits match intended use' as check_name;
