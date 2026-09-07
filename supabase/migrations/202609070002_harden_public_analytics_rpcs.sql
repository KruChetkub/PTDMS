-- Remove anonymous SECURITY DEFINER exposure without breaking public analytics.
-- Public RPCs become SECURITY INVOKER entrypoints over narrowly-permitted intake
-- and aggregate tables. Privileged writes remain in non-callable trigger functions.

create table if not exists public.public_visit_totals (
  singleton_id smallint primary key default 1 check (singleton_id = 1),
  total_visitors bigint not null default 0 check (total_visitors >= 0),
  total_page_views bigint not null default 0 check (total_page_views >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.public_visit_daily_stats (
  stat_date date primary key,
  visitors bigint not null default 0 check (visitors >= 0),
  page_views bigint not null default 0 check (page_views >= 0),
  updated_at timestamptz not null default now()
);

insert into public.public_visit_totals (
  singleton_id,
  total_visitors,
  total_page_views,
  updated_at
)
select
  1,
  count(*) filter (where session.performance_consent is true),
  (select count(*) from public.public_page_views),
  now()
from public.public_visit_sessions session
on conflict (singleton_id) do update
set
  total_visitors = excluded.total_visitors,
  total_page_views = excluded.total_page_views,
  updated_at = excluded.updated_at;

insert into public.public_visit_daily_stats (
  stat_date,
  visitors,
  page_views,
  updated_at
)
select
  current_date,
  count(*) filter (
    where session.performance_consent is true
      and session.first_seen_at::date = current_date
  ),
  (
    select count(*)
    from public.public_page_views view_event
    where view_event.view_date = current_date
  ),
  now()
from public.public_visit_sessions session
on conflict (stat_date) do update
set
  visitors = excluded.visitors,
  page_views = excluded.page_views,
  updated_at = excluded.updated_at;

alter table public.public_visit_totals enable row level security;
alter table public.public_visit_daily_stats enable row level security;

drop policy if exists "public visit totals read" on public.public_visit_totals;
create policy "public visit totals read"
on public.public_visit_totals
for select
to anon, authenticated
using (true);

drop policy if exists "public visit daily stats read" on public.public_visit_daily_stats;
create policy "public visit daily stats read"
on public.public_visit_daily_stats
for select
to anon, authenticated
using (true);

revoke all on table public.public_visit_totals from public, anon, authenticated;
revoke all on table public.public_visit_daily_stats from public, anon, authenticated;
grant select on table public.public_visit_totals to anon, authenticated;
grant select on table public.public_visit_daily_stats to anon, authenticated;

create table if not exists public.public_visit_event_intake (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  path text not null,
  consent_version text not null default 'cookie-consent-v1',
  performance_consent boolean not null default true,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint public_visit_event_intake_path_valid
    check (length(trim(path)) between 1 and 2048),
  constraint public_visit_event_intake_consent_version_valid
    check (length(consent_version) between 1 and 100),
  constraint public_visit_event_intake_user_agent_valid
    check (user_agent is null or length(user_agent) <= 500)
);

alter table public.public_visit_event_intake enable row level security;

drop policy if exists "public visit event intake insert" on public.public_visit_event_intake;
create policy "public visit event intake insert"
on public.public_visit_event_intake
for insert
to anon, authenticated
with check (performance_consent is true);

revoke all on table public.public_visit_event_intake from public, anon, authenticated;
grant insert on table public.public_visit_event_intake to anon, authenticated;

create or replace function public.process_public_visit_event_intake()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path text := coalesce(nullif(trim(new.path), ''), '/');
  v_new_session boolean := false;
  v_new_page_view_id uuid;
begin
  if new.performance_consent is not true then
    return null;
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
    new.session_id,
    coalesce(nullif(trim(new.consent_version), ''), 'cookie-consent-v1'),
    true,
    now(),
    now(),
    left(new.user_agent, 500)
  )
  on conflict (session_id) do nothing
  returning true into v_new_session;

  if not coalesce(v_new_session, false) then
    update public.public_visit_sessions
    set
      consent_version = coalesce(nullif(trim(new.consent_version), ''), 'cookie-consent-v1'),
      performance_consent = true,
      last_seen_at = now(),
      user_agent = left(new.user_agent, 500)
    where session_id = new.session_id;
  end if;

  insert into public.public_page_views (
    session_id,
    path,
    view_date,
    visited_at,
    user_agent
  )
  select
    new.session_id,
    v_path,
    current_date,
    now(),
    left(new.user_agent, 500)
  where not exists (
    select 1
    from public.public_page_views existing
    where existing.session_id = new.session_id
      and existing.path = v_path
      and existing.visited_at >= now() - interval '30 minutes'
  )
  returning id into v_new_page_view_id;

  insert into public.public_visit_totals (
    singleton_id,
    total_visitors,
    total_page_views,
    updated_at
  )
  values (
    1,
    case when coalesce(v_new_session, false) then 1 else 0 end,
    case when v_new_page_view_id is not null then 1 else 0 end,
    now()
  )
  on conflict (singleton_id) do update
  set
    total_visitors = public.public_visit_totals.total_visitors + excluded.total_visitors,
    total_page_views = public.public_visit_totals.total_page_views + excluded.total_page_views,
    updated_at = now();

  insert into public.public_visit_daily_stats (
    stat_date,
    visitors,
    page_views,
    updated_at
  )
  values (
    current_date,
    case when coalesce(v_new_session, false) then 1 else 0 end,
    case when v_new_page_view_id is not null then 1 else 0 end,
    now()
  )
  on conflict (stat_date) do update
  set
    visitors = public.public_visit_daily_stats.visitors + excluded.visitors,
    page_views = public.public_visit_daily_stats.page_views + excluded.page_views,
    updated_at = now();

  -- The intake table deliberately stores no duplicate copy of analytics data.
  return null;
end;
$$;

revoke all on function public.process_public_visit_event_intake() from public, anon, authenticated;

drop trigger if exists process_public_visit_event_intake on public.public_visit_event_intake;
create trigger process_public_visit_event_intake
before insert on public.public_visit_event_intake
for each row execute function public.process_public_visit_event_intake();

create or replace function public.record_public_page_visit(
  p_session_id uuid,
  p_path text,
  p_consent_version text default 'cookie-consent-v1',
  p_performance_consent boolean default true,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_path text := coalesce(nullif(trim(p_path), ''), '/');
begin
  if p_session_id is null then
    raise exception 'session id is required';
  end if;

  if p_performance_consent is not true then
    return jsonb_build_object(
      'sessionRecorded', false,
      'pageViewRecorded', false,
      'reason', 'performance_consent_required'
    );
  end if;

  insert into public.public_visit_event_intake (
    session_id,
    path,
    consent_version,
    performance_consent,
    user_agent
  )
  values (
    p_session_id,
    left(v_path, 2048),
    left(coalesce(nullif(trim(p_consent_version), ''), 'cookie-consent-v1'), 100),
    true,
    left(p_user_agent, 500)
  );

  return jsonb_build_object(
    'sessionRecorded', true,
    'pageViewRecorded', true,
    'dedupeWindowMinutes', 30
  );
end;
$$;

revoke all on function public.record_public_page_visit(uuid, text, text, boolean, text)
from public, anon, authenticated;
grant execute on function public.record_public_page_visit(uuid, text, text, boolean, text)
to anon, authenticated;

create or replace function public.get_public_visit_stats()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'totalVisitors', coalesce(totals.total_visitors, 0),
    'todayVisitors', coalesce(today.visitors, 0),
    'totalPageViews', coalesce(totals.total_page_views, 0),
    'todayPageViews', coalesce(today.page_views, 0),
    'updatedAt', coalesce(totals.updated_at, now())
  )
  from (values (1)) singleton(singleton_id)
  left join public.public_visit_totals totals
    on totals.singleton_id = singleton.singleton_id
  left join public.public_visit_daily_stats today
    on today.stat_date = current_date;
$$;

revoke all on function public.get_public_visit_stats() from public, anon, authenticated;
grant execute on function public.get_public_visit_stats() to anon, authenticated;

create table if not exists public.public_web_page_view_event_intake (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null,
  created_at timestamptz not null default now()
);

alter table public.public_web_page_view_event_intake enable row level security;

drop policy if exists "public web page view event intake insert"
on public.public_web_page_view_event_intake;
create policy "public web page view event intake insert"
on public.public_web_page_view_event_intake
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.public_web_pages page
    where page.id = public.public_web_page_view_event_intake.page_id
      and page.status = 'published'
  )
);

revoke all on table public.public_web_page_view_event_intake from public, anon, authenticated;
grant insert on table public.public_web_page_view_event_intake to anon, authenticated;

create or replace function public.process_public_web_page_view_event_intake()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.public_web_pages
  set view_count = view_count + 1
  where id = new.page_id
    and status = 'published';

  return null;
end;
$$;

revoke all on function public.process_public_web_page_view_event_intake()
from public, anon, authenticated;

drop trigger if exists process_public_web_page_view_event_intake
on public.public_web_page_view_event_intake;
create trigger process_public_web_page_view_event_intake
before insert on public.public_web_page_view_event_intake
for each row execute function public.process_public_web_page_view_event_intake();

create or replace function public.increment_public_web_page_view_count(p_page_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.public_web_page_view_event_intake (page_id)
  values (p_page_id);
$$;

revoke all on function public.increment_public_web_page_view_count(uuid)
from public, anon, authenticated;
grant execute on function public.increment_public_web_page_view_count(uuid)
to anon, authenticated;

notify pgrst, 'reload schema';
