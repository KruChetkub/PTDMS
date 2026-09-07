-- Run after 202609070004_move_personnel_rls_helper_private.sql.
-- The query must return zero rows.

with checks as (
  select
    to_regprocedure('public.admin_can_access_personnel(uuid)') is null
      as public_rpc_removed,
    to_regprocedure('private.admin_can_access_personnel(uuid)') is not null
      as private_helper_exists,
    coalesce(
      (
        select procedure.prosecdef
        from pg_proc procedure
        where procedure.oid = to_regprocedure(
          'private.admin_can_access_personnel(uuid)'
        )
      ),
      false
    ) as private_helper_is_security_definer,
    has_function_privilege(
      'authenticated',
      'private.admin_can_access_personnel(uuid)',
      'EXECUTE'
    ) as authenticated_can_execute,
    has_function_privilege(
      'anon',
      'private.admin_can_access_personnel(uuid)',
      'EXECUTE'
    ) as anon_can_execute
)
select *
from checks
where public_rpc_removed is not true
   or private_helper_exists is not true
   or private_helper_is_security_definer is not true
   or authenticated_can_execute is not true
   or anon_can_execute is not false;

-- Policies must retain their dependency on the moved helper. PostgreSQL updates
-- the stored policy expressions when ALTER FUNCTION SET SCHEMA preserves the OID.
select
  schemaname,
  tablename,
  policyname,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and (
    coalesce(qual, '') like '%admin_can_access_personnel%'
    or coalesce(with_check, '') like '%admin_can_access_personnel%'
  )
order by tablename, policyname;
