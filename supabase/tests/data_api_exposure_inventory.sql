-- Security Hardening Plan 1.1: Data API exposure inventory.
--
-- Run this read-only script in the Supabase SQL Editor. It does not create,
-- alter, grant, revoke, or delete database objects.
--
-- The project currently uses the public schema as its application-facing
-- schema. If additional schemas are enabled under API Settings > Exposed
-- schemas, add them to each `namespace.nspname in (...)` filter below.

-- 1. PostgREST schema configuration visible to this database session.
select
  current_database() as database_name,
  current_setting('pgrst.db_schemas', true) as postgrest_exposed_schemas,
  current_setting('pgrst.db_extra_search_path', true) as postgrest_extra_search_path;

-- 2. Tables, partitioned tables, views, materialized views, and foreign tables
-- in the exposed application schema, including effective role privileges.
select
  namespace.nspname as schema_name,
  relation.relname as object_name,
  case relation.relkind
    when 'r' then 'table'
    when 'p' then 'partitioned table'
    when 'v' then 'view'
    when 'm' then 'materialized view'
    when 'f' then 'foreign table'
    else relation.relkind::text
  end as object_type,
  pg_get_userbyid(relation.relowner) as owner_name,
  relation.relrowsecurity as rls_enabled,
  relation.relforcerowsecurity as rls_forced,
  relation.reloptions,
  has_table_privilege('anon', relation.oid, 'SELECT') as anon_select,
  has_table_privilege('anon', relation.oid, 'INSERT') as anon_insert,
  has_table_privilege('anon', relation.oid, 'UPDATE') as anon_update,
  has_table_privilege('anon', relation.oid, 'DELETE') as anon_delete,
  has_table_privilege('authenticated', relation.oid, 'SELECT') as authenticated_select,
  has_table_privilege('authenticated', relation.oid, 'INSERT') as authenticated_insert,
  has_table_privilege('authenticated', relation.oid, 'UPDATE') as authenticated_update,
  has_table_privilege('authenticated', relation.oid, 'DELETE') as authenticated_delete,
  has_table_privilege('service_role', relation.oid, 'SELECT') as service_role_select,
  has_table_privilege('service_role', relation.oid, 'INSERT') as service_role_insert,
  has_table_privilege('service_role', relation.oid, 'UPDATE') as service_role_update,
  has_table_privilege('service_role', relation.oid, 'DELETE') as service_role_delete
from pg_class relation
join pg_namespace namespace on namespace.oid = relation.relnamespace
where namespace.nspname in ('public')
  and relation.relkind in ('r', 'p', 'v', 'm', 'f')
order by object_type, schema_name, object_name;

-- 3. Functions and procedures reachable through the exposed application
-- schema, including SECURITY DEFINER and search_path information.
select
  namespace.nspname as schema_name,
  procedure.oid::regprocedure::text as signature,
  case procedure.prokind
    when 'f' then 'function'
    when 'p' then 'procedure'
    when 'a' then 'aggregate'
    when 'w' then 'window function'
    else procedure.prokind::text
  end as object_type,
  language.lanname as language,
  pg_get_userbyid(procedure.proowner) as owner_name,
  procedure.prosecdef as security_definer,
  procedure.provolatile as volatility,
  procedure.proconfig as function_settings,
  has_function_privilege('anon', procedure.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', procedure.oid, 'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role', procedure.oid, 'EXECUTE') as service_role_execute
from pg_proc procedure
join pg_namespace namespace on namespace.oid = procedure.pronamespace
join pg_language language on language.oid = procedure.prolang
where namespace.nspname in ('public')
order by schema_name, signature;

-- 4. RLS policies on application and Storage objects.
select
  policy.schemaname as schema_name,
  policy.tablename as table_name,
  policy.policyname as policy_name,
  policy.permissive,
  policy.roles,
  policy.cmd,
  policy.qual as using_expression,
  policy.with_check as with_check_expression
from pg_policies policy
where policy.schemaname in ('public', 'storage')
order by policy.schemaname, policy.tablename, policy.policyname;

-- 5. Storage buckets and their exposure/validation settings.
select
  bucket.id,
  bucket.name,
  bucket.public,
  bucket.file_size_limit,
  bucket.allowed_mime_types,
  bucket.created_at,
  bucket.updated_at
from storage.buckets bucket
order by bucket.id;

-- 6. Effective Storage object privileges. RLS policies from result set 4
-- determine which rows each role can actually operate on.
select
  has_table_privilege('anon', 'storage.objects', 'SELECT') as anon_select,
  has_table_privilege('anon', 'storage.objects', 'INSERT') as anon_insert,
  has_table_privilege('anon', 'storage.objects', 'UPDATE') as anon_update,
  has_table_privilege('anon', 'storage.objects', 'DELETE') as anon_delete,
  has_table_privilege('authenticated', 'storage.objects', 'SELECT') as authenticated_select,
  has_table_privilege('authenticated', 'storage.objects', 'INSERT') as authenticated_insert,
  has_table_privilege('authenticated', 'storage.objects', 'UPDATE') as authenticated_update,
  has_table_privilege('authenticated', 'storage.objects', 'DELETE') as authenticated_delete,
  has_table_privilege('service_role', 'storage.objects', 'SELECT') as service_role_select,
  has_table_privilege('service_role', 'storage.objects', 'INSERT') as service_role_insert,
  has_table_privilege('service_role', 'storage.objects', 'UPDATE') as service_role_update,
  has_table_privilege('service_role', 'storage.objects', 'DELETE') as service_role_delete;

-- 7. Explicit and inherited default privileges that may expose future objects.
select
  pg_get_userbyid(default_acl.defaclrole) as owner_name,
  coalesce(namespace.nspname, '(all schemas)') as schema_name,
  case default_acl.defaclobjtype
    when 'r' then 'table'
    when 'S' then 'sequence'
    when 'f' then 'function'
    when 'T' then 'type'
    when 'n' then 'schema'
    else default_acl.defaclobjtype::text
  end as object_type,
  acl.grantee::regrole::text as grantee,
  acl.privilege_type,
  acl.is_grantable
from pg_default_acl default_acl
left join pg_namespace namespace on namespace.oid = default_acl.defaclnamespace
cross join lateral aclexplode(default_acl.defaclacl) acl
where coalesce(namespace.nspname, 'public') in ('public')
  and acl.grantee in (
    0,
    (select oid from pg_roles where rolname = 'anon'),
    (select oid from pg_roles where rolname = 'authenticated'),
    (select oid from pg_roles where rolname = 'service_role')
  )
order by owner_name, schema_name, object_type, grantee, privilege_type;

-- 8. Unified export for the Supabase SQL Editor.
-- Run/export this final statement when a single CSV containing every inventory
-- category is required. `details` is JSON so categories with different fields
-- can safely share one result set.
with inventory as (
  select
    'configuration'::text as category,
    current_database()::text as object_key,
    jsonb_build_object(
      'database_name', current_database(),
      'postgrest_exposed_schemas', current_setting('pgrst.db_schemas', true),
      'postgrest_extra_search_path', current_setting('pgrst.db_extra_search_path', true)
    ) as details

  union all

  select
    'relation',
    format('%I.%I', namespace.nspname, relation.relname),
    jsonb_build_object(
      'schema_name', namespace.nspname,
      'object_name', relation.relname,
      'object_type', case relation.relkind
        when 'r' then 'table'
        when 'p' then 'partitioned table'
        when 'v' then 'view'
        when 'm' then 'materialized view'
        when 'f' then 'foreign table'
        else relation.relkind::text
      end,
      'owner_name', pg_get_userbyid(relation.relowner),
      'rls_enabled', relation.relrowsecurity,
      'rls_forced', relation.relforcerowsecurity,
      'relation_options', relation.reloptions,
      'anon', jsonb_build_object(
        'select', has_table_privilege('anon', relation.oid, 'SELECT'),
        'insert', has_table_privilege('anon', relation.oid, 'INSERT'),
        'update', has_table_privilege('anon', relation.oid, 'UPDATE'),
        'delete', has_table_privilege('anon', relation.oid, 'DELETE')
      ),
      'authenticated', jsonb_build_object(
        'select', has_table_privilege('authenticated', relation.oid, 'SELECT'),
        'insert', has_table_privilege('authenticated', relation.oid, 'INSERT'),
        'update', has_table_privilege('authenticated', relation.oid, 'UPDATE'),
        'delete', has_table_privilege('authenticated', relation.oid, 'DELETE')
      ),
      'service_role', jsonb_build_object(
        'select', has_table_privilege('service_role', relation.oid, 'SELECT'),
        'insert', has_table_privilege('service_role', relation.oid, 'INSERT'),
        'update', has_table_privilege('service_role', relation.oid, 'UPDATE'),
        'delete', has_table_privilege('service_role', relation.oid, 'DELETE')
      )
    )
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname in ('public')
    and relation.relkind in ('r', 'p', 'v', 'm', 'f')

  union all

  select
    'routine',
    procedure.oid::regprocedure::text,
    jsonb_build_object(
      'schema_name', namespace.nspname,
      'signature', procedure.oid::regprocedure::text,
      'object_type', case procedure.prokind
        when 'f' then 'function'
        when 'p' then 'procedure'
        when 'a' then 'aggregate'
        when 'w' then 'window function'
        else procedure.prokind::text
      end,
      'language', language.lanname,
      'owner_name', pg_get_userbyid(procedure.proowner),
      'security_definer', procedure.prosecdef,
      'volatility', procedure.provolatile,
      'function_settings', procedure.proconfig,
      'anon_execute', has_function_privilege('anon', procedure.oid, 'EXECUTE'),
      'authenticated_execute', has_function_privilege('authenticated', procedure.oid, 'EXECUTE'),
      'service_role_execute', has_function_privilege('service_role', procedure.oid, 'EXECUTE')
    )
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  join pg_language language on language.oid = procedure.prolang
  where namespace.nspname in ('public')

  union all

  select
    'policy',
    format('%I.%I:%s', policy.schemaname, policy.tablename, policy.policyname),
    jsonb_build_object(
      'schema_name', policy.schemaname,
      'table_name', policy.tablename,
      'policy_name', policy.policyname,
      'permissive', policy.permissive,
      'roles', policy.roles,
      'command', policy.cmd,
      'using_expression', policy.qual,
      'with_check_expression', policy.with_check
    )
  from pg_policies policy
  where policy.schemaname in ('public', 'storage')

  union all

  select
    'storage_bucket',
    bucket.id,
    jsonb_build_object(
      'id', bucket.id,
      'name', bucket.name,
      'public', bucket.public,
      'file_size_limit', bucket.file_size_limit,
      'allowed_mime_types', bucket.allowed_mime_types,
      'created_at', bucket.created_at,
      'updated_at', bucket.updated_at
    )
  from storage.buckets bucket

  union all

  select
    'storage_privileges',
    'storage.objects',
    jsonb_build_object(
      'anon', jsonb_build_object(
        'select', has_table_privilege('anon', 'storage.objects', 'SELECT'),
        'insert', has_table_privilege('anon', 'storage.objects', 'INSERT'),
        'update', has_table_privilege('anon', 'storage.objects', 'UPDATE'),
        'delete', has_table_privilege('anon', 'storage.objects', 'DELETE')
      ),
      'authenticated', jsonb_build_object(
        'select', has_table_privilege('authenticated', 'storage.objects', 'SELECT'),
        'insert', has_table_privilege('authenticated', 'storage.objects', 'INSERT'),
        'update', has_table_privilege('authenticated', 'storage.objects', 'UPDATE'),
        'delete', has_table_privilege('authenticated', 'storage.objects', 'DELETE')
      ),
      'service_role', jsonb_build_object(
        'select', has_table_privilege('service_role', 'storage.objects', 'SELECT'),
        'insert', has_table_privilege('service_role', 'storage.objects', 'INSERT'),
        'update', has_table_privilege('service_role', 'storage.objects', 'UPDATE'),
        'delete', has_table_privilege('service_role', 'storage.objects', 'DELETE')
      )
    )

  union all

  select
    'default_privilege',
    concat_ws(
      ':',
      pg_get_userbyid(default_acl.defaclrole),
      coalesce(namespace.nspname, '(all schemas)'),
      default_acl.defaclobjtype,
      case when acl.grantee = 0 then 'public' else acl.grantee::regrole::text end,
      acl.privilege_type
    ),
    jsonb_build_object(
      'owner_name', pg_get_userbyid(default_acl.defaclrole),
      'schema_name', coalesce(namespace.nspname, '(all schemas)'),
      'object_type', case default_acl.defaclobjtype
        when 'r' then 'table'
        when 'S' then 'sequence'
        when 'f' then 'function'
        when 'T' then 'type'
        when 'n' then 'schema'
        else default_acl.defaclobjtype::text
      end,
      'grantee', case when acl.grantee = 0 then 'public' else acl.grantee::regrole::text end,
      'privilege_type', acl.privilege_type,
      'is_grantable', acl.is_grantable
    )
  from pg_default_acl default_acl
  left join pg_namespace namespace on namespace.oid = default_acl.defaclnamespace
  cross join lateral aclexplode(default_acl.defaclacl) acl
  where coalesce(namespace.nspname, 'public') in ('public')
    and acl.grantee in (
      0,
      (select oid from pg_roles where rolname = 'anon'),
      (select oid from pg_roles where rolname = 'authenticated'),
      (select oid from pg_roles where rolname = 'service_role')
    )
)
select category, object_key, details
from inventory
order by category, object_key;
