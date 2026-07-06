-- Public home cookie consent analytics.
-- Counts anonymous sessions and deduped page views without storing directly identifying profile data.

create table if not exists public.public_visit_sessions (
  session_id uuid primary key,
  consent_version text not null default 'cookie-consent-v1',
  performance_consent boolean not null default false,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.public_page_views (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.public_visit_sessions(session_id) on delete cascade,
  path text not null,
  view_date date not null default current_date,
  visited_at timestamptz not null default now(),
  user_agent text,
  created_at timestamptz not null default now(),
  constraint public_page_views_path_not_blank check (length(trim(path)) > 0)
);

create index if not exists idx_public_visit_sessions_first_seen_at on public.public_visit_sessions(first_seen_at);
create index if not exists idx_public_visit_sessions_last_seen_at on public.public_visit_sessions(last_seen_at);
create index if not exists idx_public_page_views_session_path_visited_at on public.public_page_views(session_id, path, visited_at desc);
create index if not exists idx_public_page_views_view_date on public.public_page_views(view_date);
create index if not exists idx_public_page_views_path on public.public_page_views(path);

drop trigger if exists set_public_visit_sessions_updated_at on public.public_visit_sessions;
create trigger set_public_visit_sessions_updated_at
before update on public.public_visit_sessions
for each row
execute function public.set_updated_at();

alter table public.public_visit_sessions enable row level security;
alter table public.public_page_views enable row level security;

drop policy if exists "public visit sessions no direct read" on public.public_visit_sessions;
drop policy if exists "public page views no direct read" on public.public_page_views;

create or replace function public.record_public_page_visit(
  p_session_id uuid,
  p_path text,
  p_consent_version text default 'cookie-consent-v1',
  p_performance_consent boolean default true,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path text := coalesce(nullif(trim(p_path), ''), '/');
  v_existing_view_id uuid;
  v_view_inserted boolean := false;
begin
  if p_session_id is null then
    raise exception 'session id is required';
  end if;

  if p_performance_consent is not true then
    return jsonb_build_object('sessionRecorded', false, 'pageViewRecorded', false, 'reason', 'performance_consent_required');
  end if;

  insert into public.public_visit_sessions (
    session_id,
    consent_version,
    performance_consent,
    first_seen_at,
    last_seen_at,
    user_agent
  )
  values (
    p_session_id,
    coalesce(nullif(trim(p_consent_version), ''), 'cookie-consent-v1'),
    true,
    now(),
    now(),
    left(p_user_agent, 500)
  )
  on conflict (session_id) do update
  set
    consent_version = excluded.consent_version,
    performance_consent = true,
    last_seen_at = now(),
    user_agent = excluded.user_agent;

  select id into v_existing_view_id
  from public.public_page_views
  where session_id = p_session_id
    and path = v_path
    and visited_at >= now() - interval '30 minutes'
  order by visited_at desc
  limit 1;

  if v_existing_view_id is null then
    insert into public.public_page_views (session_id, path, view_date, visited_at, user_agent)
    values (p_session_id, v_path, current_date, now(), left(p_user_agent, 500));
    v_view_inserted := true;
  end if;

  return jsonb_build_object(
    'sessionRecorded', true,
    'pageViewRecorded', v_view_inserted,
    'dedupeWindowMinutes', 30
  );
end;
$$;

create or replace function public.get_public_visit_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'totalVisitors', (select count(*) from public.public_visit_sessions where performance_consent is true),
    'todayVisitors', (select count(*) from public.public_visit_sessions where performance_consent is true and first_seen_at::date = current_date),
    'totalPageViews', (select count(*) from public.public_page_views),
    'todayPageViews', (select count(*) from public.public_page_views where view_date = current_date),
    'updatedAt', now()
  );
$$;

grant execute on function public.record_public_page_visit(uuid, text, text, boolean, text) to anon, authenticated;
grant execute on function public.get_public_visit_stats() to anon, authenticated;