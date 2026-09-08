-- Security contract for 202609080001_add_selective_mfa_enforcement.sql.
-- Safe to run in the Supabase SQL Editor; this test does not modify data.

do $block$
declare
  list_oid oid := to_regprocedure('public.list_mfa_enforcement_users()');
  set_oid oid := to_regprocedure('public.set_mfa_requirement(uuid[],boolean)');
  implementation_source text;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'mfa_required'
      and is_nullable = 'NO'
  ) then
    raise exception 'profiles.mfa_required is missing or nullable';
  end if;

  if list_oid is null or set_oid is null then
    raise exception 'MFA enforcement RPCs are missing';
  end if;

  if has_function_privilege('anon', list_oid, 'EXECUTE')
    or has_function_privilege('anon', set_oid, 'EXECUTE')
    or not has_function_privilege('authenticated', list_oid, 'EXECUTE')
    or not has_function_privilege('authenticated', set_oid, 'EXECUTE')
  then
    raise exception 'MFA enforcement wrapper privileges are incorrect';
  end if;

  if exists (
    select 1 from pg_proc procedure
    where procedure.oid in (list_oid, set_oid)
      and procedure.prosecdef
  ) then
    raise exception 'Public MFA enforcement wrappers must be SECURITY INVOKER';
  end if;

  select procedure.prosrc
  into implementation_source
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'private'
    and procedure.proname = 'set_mfa_requirement_impl';

  if implementation_source is null
    or implementation_source not like '%super_admin required%'
    or implementation_source not like '%aal2 required%'
    or implementation_source not like '%mfa_requirement_enabled%'
  then
    raise exception 'MFA enforcement implementation lacks role, AAL2, or audit guards';
  end if;

  if not exists (
    select 1
    from pg_trigger trigger_definition
    join pg_class relation on relation.oid = trigger_definition.tgrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where not trigger_definition.tgisinternal
      and namespace.nspname = 'public'
      and relation.relname = 'profiles'
      and trigger_definition.tgname = 'protect_mfa_requirement_fields'
  ) then
    raise exception 'MFA requirement field-protection trigger is missing';
  end if;
end;
$block$;

select 'PASS' as result,
  'selective MFA enforcement is super-admin/AAL2 protected' as check_name;
