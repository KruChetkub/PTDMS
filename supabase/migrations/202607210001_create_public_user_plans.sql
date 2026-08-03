-- Public user submitted plans for the public-home plan repository.
-- This table is intentionally separate from site_content_documents / Site Manager content.

do $$
begin
  create type public.public_user_plan_category as enum (
    'plan-level-1',
    'plan-level-2',
    'plan-level-3',
    'executive-policy',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.public_user_plans (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(user_id) on delete cascade,
  owner_name text not null default '',
  owner_work_group text,
  category public.public_user_plan_category not null,
  sort_order integer not null default 10,
  title text not null,
  subtitle text not null default '',
  description text not null default '',
  icon_key text not null default 'file',
  color text not null default 'bg-blue-600',
  action_label text not null default 'รายละเอียด',
  pdf_url text not null default '',
  cover_image_url text not null default '',
  cover_image_layout text not null default 'portrait',
  status public.site_content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_user_plans_title_not_blank check (length(trim(title)) > 0),
  constraint public_user_plans_cover_layout_valid check (cover_image_layout in ('portrait', 'landscape'))
);

create index if not exists idx_public_user_plans_status_category_sort_order
on public.public_user_plans (status, category, sort_order, updated_at desc);

create index if not exists idx_public_user_plans_owner_updated
on public.public_user_plans (owner_user_id, updated_at desc);

alter table public.public_user_plans enable row level security;

drop policy if exists "public user plans read published or own" on public.public_user_plans;
create policy "public user plans read published or own"
on public.public_user_plans
for select
to anon, authenticated
using (
  status = 'published'
  or owner_user_id = auth.uid()
  or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "public user plans insert own" on public.public_user_plans;
create policy "public user plans insert own"
on public.public_user_plans
for insert
to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists "public user plans update own" on public.public_user_plans;
create policy "public user plans update own"
on public.public_user_plans
for update
to authenticated
using (owner_user_id = auth.uid() or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (owner_user_id = auth.uid() or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "public user plans delete own" on public.public_user_plans;
create policy "public user plans delete own"
on public.public_user_plans
for delete
to authenticated
using (owner_user_id = auth.uid() or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop trigger if exists set_public_user_plans_updated_at on public.public_user_plans;
create trigger set_public_user_plans_updated_at
before update on public.public_user_plans
for each row
execute function public.set_updated_at();

grant select on public.public_user_plans to anon;
grant select, insert, update, delete on public.public_user_plans to authenticated;