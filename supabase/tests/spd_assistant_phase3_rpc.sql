-- SPD Assistant Phase 3 RPC verification.
-- Run after applying migrations through 202606090004_spd_assistant_phase3_rpc.sql.

do $$
begin
  if public.spd_assistant_normalize_route('/personnel/00000000-0000-0000-0000-000000000000') <> '/personnel/:id' then
    raise exception 'Dynamic personnel route was not normalized';
  end if;

  if public.spd_assistant_normalize_route('/portal') <> '/portal' then
    raise exception 'Static route normalization changed unexpectedly';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'search_spd_assistant_knowledge'
      and p.prosecdef = true
      and p.provolatile = 's'
  ) then
    raise exception 'search_spd_assistant_knowledge must exist as stable security definer function';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_spd_assistant_page_context'
      and p.prosecdef = true
      and p.provolatile = 's'
  ) then
    raise exception 'get_spd_assistant_page_context must exist as stable security definer function';
  end if;

  if has_function_privilege(
    'anon',
    'public.search_spd_assistant_knowledge(text,text,text,integer)',
    'EXECUTE'
  ) then
    raise exception 'anon role can execute search_spd_assistant_knowledge';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.search_spd_assistant_knowledge(text,text,text,integer)',
    'EXECUTE'
  ) then
    raise exception 'authenticated role cannot execute search_spd_assistant_knowledge';
  end if;
end $$;

-- Manual authenticated checks:
-- 1. search_spd_assistant_knowledge('', '/portal', 'การนำทาง', 5) returns zero rows.
-- 2. A matching question returns only active Thai knowledge allowed for the active role.
-- 3. An unrelated question with matching route returns zero rows or service fallback.
-- 4. get_spd_assistant_page_context('/personnel/<id>') resolves context for '/personnel/:id' if seeded and role-allowed.
