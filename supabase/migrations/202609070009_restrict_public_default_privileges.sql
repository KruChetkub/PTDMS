-- Security Hardening Plan 1.6.
-- Make access to future public-schema objects opt-in. Every future migration
-- must grant only the table, sequence, and function privileges it needs.

begin;

alter default privileges for role postgres in schema public
  revoke all privileges on tables
  from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all privileges on sequences
  from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all privileges on functions
  from public, anon, authenticated, service_role;

-- Hosted projects normally do not grant postgres membership in the internal
-- supabase_admin role. Apply the same restriction only where PostgreSQL says
-- the current migration role is allowed to manage those defaults.
do $block$
begin
  if pg_has_role(current_user, 'supabase_admin', 'MEMBER') then
    execute $sql$
      alter default privileges for role supabase_admin in schema public
        revoke all privileges on tables
        from public, anon, authenticated, service_role
    $sql$;

    execute $sql$
      alter default privileges for role supabase_admin in schema public
        revoke all privileges on sequences
        from public, anon, authenticated, service_role
    $sql$;

    execute $sql$
      alter default privileges for role supabase_admin in schema public
        revoke all privileges on functions
        from public, anon, authenticated, service_role
    $sql$;
  else
    raise notice 'supabase_admin default ACLs are platform-managed and were not changed';
  end if;
end;
$block$;

commit;
