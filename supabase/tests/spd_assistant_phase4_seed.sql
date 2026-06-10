-- SPD Assistant Phase 4 seed verification.
-- Run after applying migrations through 202606090005_spd_assistant_phase4_seed_import_ready.sql.

do $$
begin
  if not exists (
    select 1
    from public.spd_assistant_sources
    where source_key = 'phase4-starter-knowledge'
      and active = true
  ) then
    raise exception 'Phase 4 starter knowledge source is missing';
  end if;

  if not exists (
    select 1
    from public.spd_assistant_sources
    where source_key = 'phase4-page-contexts'
      and active = true
  ) then
    raise exception 'Phase 4 page context source is missing';
  end if;

  if (
    select count(*)
    from public.spd_assistant_page_contexts
    where route in ('/', '/profile', '/self-service', '/dashboard', '/courses', '/analytics', '/it-assets', '/it-assets/manage', '/strategy-calendar', '/admin/security', '*')
      and active = true
  ) < 11 then
    raise exception 'Phase 4 starter page contexts are incomplete';
  end if;

  if (
    select count(*)
    from public.spd_assistant_knowledge
    where source_id = (select id from public.spd_assistant_sources where source_key = 'phase4-starter-knowledge' limit 1)
      and active = true
      and language = 'th'
  ) < 10 then
    raise exception 'Phase 4 starter knowledge records are incomplete';
  end if;

  if not exists (
    select 1
    from public.spd_assistant_knowledge
    where question = 'SPD Assistant ตอบจากที่ไหน'
      and answer like '%ขออภัย ไม่พบข้อมูลในฐานความรู้ของระบบ%'
      and active = true
  ) then
    raise exception 'Assistant source policy starter knowledge is missing';
  end if;
end $$;
