-- Security contract for 202609070009_restrict_public_default_privileges.sql.
-- Safe to run in the Supabase SQL Editor; this test does not modify data.

do $block$
declare
  insecure_postgres_defaults text;
  insecure_supabase_admin_defaults text;
begin
  -- Functions normally default to EXECUTE for PUBLIC. A postgres-owned
  -- function default ACL must therefore exist after the explicit revoke.
  if not exists (
    select 1
    from pg_default_acl default_acl
    join pg_namespace namespace on namespace.oid = default_acl.defaclnamespace
    where namespace.nspname = 'public'
      and pg_get_userbyid(default_acl.defaclrole) = 'postgres'
      and default_acl.defaclobjtype = 'f'
  ) then
    raise exception 'Missing explicit postgres function default ACL for public schema';
  end if;

  select string_agg(
    concat_ws(
      ':',
      pg_get_userbyid(default_acl.defaclrole),
      default_acl.defaclobjtype,
      case
        when acl.grantee = 0 then 'PUBLIC'
        else acl.grantee::regrole::text
      end,
      acl.privilege_type
    ),
    ', '
    order by default_acl.defaclobjtype, acl.grantee, acl.privilege_type
  )
  into insecure_postgres_defaults
  from pg_default_acl default_acl
  join pg_namespace namespace on namespace.oid = default_acl.defaclnamespace
  cross join lateral aclexplode(default_acl.defaclacl) acl
  where namespace.nspname = 'public'
    and pg_get_userbyid(default_acl.defaclrole) = 'postgres'
    and default_acl.defaclobjtype in ('r', 'S', 'f')
    and (
      acl.grantee = 0
      or acl.grantee in (
        select role.oid
        from pg_roles role
        where role.rolname in ('anon', 'authenticated', 'service_role')
      )
    );

  if insecure_postgres_defaults is not null then
    raise exception 'postgres still grants insecure defaults in public: %',
      insecure_postgres_defaults;
  end if;

  select string_agg(
    concat_ws(
      ':',
      default_acl.defaclobjtype,
      case
        when acl.grantee = 0 then 'PUBLIC'
        else acl.grantee::regrole::text
      end,
      acl.privilege_type
    ),
    ', '
    order by default_acl.defaclobjtype, acl.grantee, acl.privilege_type
  )
  into insecure_supabase_admin_defaults
  from pg_default_acl default_acl
  join pg_namespace namespace on namespace.oid = default_acl.defaclnamespace
  cross join lateral aclexplode(default_acl.defaclacl) acl
  where namespace.nspname = 'public'
    and pg_get_userbyid(default_acl.defaclrole) = 'supabase_admin'
    and default_acl.defaclobjtype in ('r', 'S', 'f')
    and (
      acl.grantee = 0
      or acl.grantee in (
        select role.oid
        from pg_roles role
        where role.rolname in ('anon', 'authenticated', 'service_role')
      )
    );

  if pg_has_role(current_user, 'supabase_admin', 'MEMBER')
    and insecure_supabase_admin_defaults is not null
  then
    raise exception 'supabase_admin defaults were manageable but remain broad: %',
      insecure_supabase_admin_defaults;
  end if;

  if insecure_supabase_admin_defaults is not null then
    raise notice 'Platform-managed supabase_admin defaults remain: %',
      insecure_supabase_admin_defaults;
  end if;
end;
$block$;

select
  'PASS' as result,
  'postgres-owned future objects require explicit grants' as check_name,
  not pg_has_role(current_user, 'supabase_admin', 'MEMBER') as supabase_admin_platform_managed;
