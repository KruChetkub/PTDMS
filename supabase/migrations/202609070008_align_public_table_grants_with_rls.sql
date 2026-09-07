-- Security Hardening Plan 1.5.
-- Align public-schema table grants with the operations explicitly represented
-- by RLS policies. RLS remains the row-level authorization boundary.

begin;

do $block$
declare
  relation_record record;
  role_name name;
  operation text;
begin
  -- Remove inherited/broad access first. Internal Supabase roles other than the
  -- three application-facing roles are deliberately left unchanged.
  for relation_record in
    select namespace.nspname as schema_name, relation.relname as table_name
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('r', 'p')
    order by relation.relname
  loop
    execute format(
      'revoke all privileges on table %I.%I from public, anon, authenticated',
      relation_record.schema_name,
      relation_record.table_name
    );

    -- The server-only service role keeps CRUD access and continues to bypass
    -- RLS. It must never be used in browser code.
    execute format(
      'grant select, insert, update, delete on table %I.%I to service_role',
      relation_record.schema_name,
      relation_record.table_name
    );
  end loop;

  -- Regrant only operations for which the target role has an RLS policy.
  foreach role_name in array array['anon', 'authenticated']::name[]
  loop
    for relation_record in
      select namespace.nspname as schema_name, relation.relname as table_name
      from pg_class relation
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relkind in ('r', 'p')
      order by relation.relname
    loop
      foreach operation in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE']
      loop
        if exists (
          select 1
          from pg_policies policy
          where policy.schemaname = relation_record.schema_name
            and policy.tablename = relation_record.table_name
            and policy.cmd in (operation, 'ALL')
            and policy.roles && array[role_name, 'public'::name]
        ) then
          execute format(
            'grant %s on table %I.%I to %I',
            operation,
            relation_record.schema_name,
            relation_record.table_name,
            role_name
          );
        end if;
      end loop;
    end loop;
  end loop;
end;
$block$;

notify pgrst, 'reload schema';

commit;
