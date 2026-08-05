-- Public performance results shown in the Strategic Information Repository.
-- This migration is additive and preserves a snapshot for every insert or update.

create table if not exists public.public_performance_results (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(user_id) on delete restrict,
  owner_name text not null default '',
  owner_work_group text,
  category text not null default 'key-result',
  fiscal_year smallint not null,
  sort_order integer not null default 10,
  title text not null,
  subtitle text not null default '',
  description text not null default '',
  icon_key text not null default 'growth',
  color text not null default 'bg-sky-600',
  action_label text not null default 'view-result',
  pdf_url text not null default '',
  cover_image_url text not null default '',
  cover_image_layout text not null default 'landscape',
  status public.site_content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_performance_results_title_not_blank check (length(trim(title)) > 0),
  constraint public_performance_results_category_valid check (category in ('key-result', 'annual-report', 'indicator-report', 'other')),
  constraint public_performance_results_fiscal_year_valid check (fiscal_year between 2500 and 2700),
  constraint public_performance_results_sort_order_valid check (sort_order > 0),
  constraint public_performance_results_cover_layout_valid check (cover_image_layout in ('portrait', 'landscape')),
  constraint public_performance_results_pdf_url_safe check (pdf_url = '' or pdf_url ~* '^https?://'),
  constraint public_performance_results_cover_url_safe check (cover_image_url = '' or cover_image_url ~* '^https?://')
);

create table if not exists public.public_performance_result_history (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null,
  action text not null,
  snapshot jsonb not null,
  actor_id uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  constraint public_performance_result_history_action_valid check (action in ('created', 'updated'))
);

create index if not exists idx_public_performance_results_public_listing
on public.public_performance_results (status, fiscal_year desc, category, sort_order, updated_at desc);
create index if not exists idx_public_performance_results_owner_updated
on public.public_performance_results (owner_user_id, updated_at desc);
create index if not exists idx_public_performance_result_history_result_created
on public.public_performance_result_history (result_id, created_at desc);

drop trigger if exists set_public_performance_results_updated_at on public.public_performance_results;
create trigger set_public_performance_results_updated_at
before update on public.public_performance_results
for each row execute function public.set_updated_at();

create or replace function public.capture_public_performance_result_history()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.public_performance_result_history (result_id, action, snapshot, actor_id)
  values (new.id, case when tg_op = 'INSERT' then 'created' else 'updated' end, to_jsonb(new), auth.uid());
  return new;
end;
$$;

drop trigger if exists capture_public_performance_result_history on public.public_performance_results;
create trigger capture_public_performance_result_history
after insert or update on public.public_performance_results
for each row execute function public.capture_public_performance_result_history();

alter table public.public_performance_results enable row level security;
alter table public.public_performance_result_history enable row level security;

drop policy if exists "performance results read published or own" on public.public_performance_results;
create policy "performance results read published or own" on public.public_performance_results
for select to anon, authenticated
using (status = 'published' or owner_user_id = auth.uid() or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "performance results insert own" on public.public_performance_results;
create policy "performance results insert own" on public.public_performance_results
for insert to authenticated with check (owner_user_id = auth.uid());

drop policy if exists "performance results update own" on public.public_performance_results;
create policy "performance results update own" on public.public_performance_results
for update to authenticated
using (owner_user_id = auth.uid() or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (owner_user_id = auth.uid() or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "performance result history admin read" on public.public_performance_result_history;
create policy "performance result history admin read" on public.public_performance_result_history
for select to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

grant select on public.public_performance_results to anon;
grant select, insert, update on public.public_performance_results to authenticated;
grant select on public.public_performance_result_history to authenticated;
