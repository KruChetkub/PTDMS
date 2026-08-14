-- Create public standalone web pages managed from strategic-repository.

alter table public.public_repository_categories
  drop constraint if exists public_repository_categories_type_valid;

alter table public.public_repository_categories
  add constraint public_repository_categories_type_valid
  check (repository_type in ('plan', 'performance', 'research', 'home', 'web-page'));

create table if not exists public.public_web_pages (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'general',
  slug text not null,
  title text not null,
  description text not null default '',
  pdf_url text not null default '',
  cover_image_url text not null default '',
  cover_image_layout text not null default 'portrait',
  sort_order integer not null default 10,
  status text not null default 'draft',
  view_count integer not null default 0,
  created_by uuid references public.profiles(user_id) on delete set null,
  updated_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_web_pages_slug_unique unique (slug),
  constraint public_web_pages_slug_valid check (slug ~ '^[a-z0-9ก-๙]+(?:-[a-z0-9ก-๙]+)*$' and length(slug) between 1 and 120),
  constraint public_web_pages_title_valid check (length(trim(title)) between 1 and 160),
  constraint public_web_pages_description_valid check (length(description) <= 4000),
  constraint public_web_pages_pdf_url_safe check (pdf_url = '' or pdf_url ~* '^https?://'),
  constraint public_web_pages_cover_url_safe check (cover_image_url = '' or cover_image_url ~* '^https?://'),
  constraint public_web_pages_cover_layout_valid check (cover_image_layout in ('portrait', 'landscape')),
  constraint public_web_pages_sort_order_valid check (sort_order > 0),
  constraint public_web_pages_status_valid check (status in ('draft', 'published')),
  constraint public_web_pages_view_count_valid check (view_count >= 0)
);

alter table public.public_web_pages
  add column if not exists category text not null default 'general',
  add column if not exists description text not null default '',
  add column if not exists pdf_url text not null default '',
  add column if not exists cover_image_url text not null default '',
  add column if not exists cover_image_layout text not null default 'portrait',
  add column if not exists sort_order integer not null default 10;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'public_web_pages_description_valid'
      and conrelid = 'public.public_web_pages'::regclass
  ) then
    alter table public.public_web_pages
      add constraint public_web_pages_description_valid check (length(description) <= 4000);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'public_web_pages_pdf_url_safe'
      and conrelid = 'public.public_web_pages'::regclass
  ) then
    alter table public.public_web_pages
      add constraint public_web_pages_pdf_url_safe check (pdf_url = '' or pdf_url ~* '^https?://');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'public_web_pages_cover_url_safe'
      and conrelid = 'public.public_web_pages'::regclass
  ) then
    alter table public.public_web_pages
      add constraint public_web_pages_cover_url_safe check (cover_image_url = '' or cover_image_url ~* '^https?://');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'public_web_pages_cover_layout_valid'
      and conrelid = 'public.public_web_pages'::regclass
  ) then
    alter table public.public_web_pages
      add constraint public_web_pages_cover_layout_valid check (cover_image_layout in ('portrait', 'landscape'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'public_web_pages_sort_order_valid'
      and conrelid = 'public.public_web_pages'::regclass
  ) then
    alter table public.public_web_pages
      add constraint public_web_pages_sort_order_valid check (sort_order > 0);
  end if;
end;
$$;

create index if not exists idx_public_web_pages_public_listing
on public.public_web_pages (status, category, sort_order, updated_at desc);

insert into public.public_repository_categories
  (id, repository_type, category_key, label, color, tone, sort_order, is_active)
values
  ('53000000-0000-4000-8000-000000000001', 'web-page', 'general', 'หน้าเว็บไซต์ทั่วไป', 'bg-blue-600', 'blue', 10, true),
  ('53000000-0000-4000-8000-000000000002', 'web-page', 'policy', 'นโยบายและประกาศ', 'bg-emerald-600', 'emerald', 20, true),
  ('53000000-0000-4000-8000-000000000003', 'web-page', 'document', 'เอกสารเผยแพร่', 'bg-violet-600', 'violet', 30, true)
on conflict (repository_type, category_key) do nothing;

drop trigger if exists validate_public_web_page_category on public.public_web_pages;
create trigger validate_public_web_page_category
before insert or update of category on public.public_web_pages
for each row execute function public.validate_public_repository_category('web-page');

create or replace function public.prevent_used_public_repository_category_delete()
returns trigger
language plpgsql
as $$
declare
  category_is_used boolean := false;
begin
  if old.repository_type = 'plan' then
    select exists(select 1 from public.public_user_plans where category = old.category_key) into category_is_used;
  elsif old.repository_type = 'performance' then
    select exists(select 1 from public.public_performance_results where category = old.category_key) into category_is_used;
  elsif old.repository_type = 'research' then
    select exists(select 1 from public.public_research_items where category = old.category_key) into category_is_used;
  elsif old.repository_type = 'home' then
    select exists(select 1 from public.public_home_content_items where section = old.category_key) into category_is_used;
  elsif old.repository_type = 'web-page' then
    select exists(select 1 from public.public_web_pages where category = old.category_key) into category_is_used;
  end if;

  if category_is_used then
    raise exception 'Cannot delete category "%" because it is used by public repository items.', old.label;
  end if;

  return old;
end;
$$;

create or replace function public.set_public_web_pages_updated_at()
returns trigger
language plpgsql
as $$
begin
  if (to_jsonb(new) - 'view_count' - 'updated_at') is distinct from (to_jsonb(old) - 'view_count' - 'updated_at') then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists set_public_web_pages_updated_at on public.public_web_pages;
create trigger set_public_web_pages_updated_at
before update on public.public_web_pages
for each row execute function public.set_public_web_pages_updated_at();

create or replace function public.increment_public_web_page_view_count(p_page_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.public_web_pages
  set view_count = view_count + 1
  where id = p_page_id
    and status = 'published';
$$;

alter table public.public_web_pages enable row level security;

drop policy if exists "public web pages read published or admin" on public.public_web_pages;
create policy "public web pages read published or admin"
on public.public_web_pages
for select
to anon, authenticated
using (
  status = 'published'
  or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "public web pages admin insert" on public.public_web_pages;
create policy "public web pages admin insert"
on public.public_web_pages
for insert
to authenticated
with check (
  public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
  and created_by = auth.uid()
  and updated_by = auth.uid()
);

drop policy if exists "public web pages admin update" on public.public_web_pages;
create policy "public web pages admin update"
on public.public_web_pages
for update
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (
  public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
  and updated_by = auth.uid()
);

drop policy if exists "public web pages admin delete" on public.public_web_pages;
create policy "public web pages admin delete"
on public.public_web_pages
for delete
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

grant select on public.public_web_pages to anon;
grant select, insert, update, delete on public.public_web_pages to authenticated;
grant execute on function public.increment_public_web_page_view_count(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
