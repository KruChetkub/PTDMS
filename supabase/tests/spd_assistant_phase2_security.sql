-- SPD Assistant Phase 2 security verification.
-- Run after applying migrations through 202606090003_spd_assistant_phase2_security_rpc.sql.

do $$
declare
  expected_table text;
  expected_policy text;
begin
  foreach expected_table in array array[
    'spd_assistant_sources',
    'spd_assistant_knowledge',
    'spd_assistant_page_contexts',
    'spd_assistant_conversations',
    'spd_assistant_messages',
    'spd_assistant_feedback'
  ]
  loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = expected_table
        and c.relrowsecurity = true
    ) then
      raise exception 'RLS is not enabled on public.%', expected_table;
    end if;
  end loop;

  foreach expected_policy in array array[
    'spd assistant sources read active',
    'spd assistant sources admin manage',
    'spd assistant knowledge role read',
    'spd assistant knowledge admin manage',
    'spd assistant contexts role read',
    'spd assistant contexts admin manage',
    'spd assistant conversations own read',
    'spd assistant conversations admin governance read',
    'spd assistant conversations own insert',
    'spd assistant messages own read',
    'spd assistant messages admin governance read',
    'spd assistant messages own insert',
    'spd assistant feedback own insert',
    'spd assistant feedback admin read'
  ]
  loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and policyname = expected_policy
    ) then
      raise exception 'Missing SPD Assistant RLS policy: %', expected_policy;
    end if;
  end loop;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'search_spd_assistant_knowledge'
      and p.prosecdef = true
  ) then
    raise exception 'search_spd_assistant_knowledge security definer RPC is missing';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_spd_assistant_page_context'
      and p.prosecdef = true
  ) then
    raise exception 'get_spd_assistant_page_context security definer RPC is missing';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.search_spd_assistant_knowledge(text,text,text,integer)',
    'EXECUTE'
  ) then
    raise exception 'authenticated role cannot execute search_spd_assistant_knowledge';
  end if;

  if has_function_privilege(
    'anon',
    'public.search_spd_assistant_knowledge(text,text,text,integer)',
    'EXECUTE'
  ) then
    raise exception 'anon role can execute search_spd_assistant_knowledge';
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 'spd-assistant-imports'
      and public = false
  ) then
    raise exception 'Private storage bucket spd-assistant-imports is missing';
  end if;
end $$;

-- Manual authenticated role checks to perform in Supabase SQL/API tests:
-- 1. Empty p_query returns zero rows.
-- 2. Unrelated text on a matching route returns zero rows or the service fallback.
-- 3. Inactive knowledge is not returned.
-- 4. Knowledge for another related_roles value is not returned to a lower role.
-- 5. A user cannot insert messages into another user's conversation.
-- 6. Non-admin roles cannot read/write storage.objects for bucket spd-assistant-imports.
