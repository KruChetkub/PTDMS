-- Manage public repository categories from the application without losing existing records.

create table if not exists public.public_repository_categories (
  id uuid primary key default gen_random_uuid(),
  repository_type text not null,
  category_key text not null,
  label text not null,
  color text not null default 'bg-blue-600',
  tone text not null default 'blue',
  sort_order integer not null default 10,
  is_active boolean not null default true,
  created_by uuid references public.profiles(user_id) on delete set null,
  updated_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_repository_categories_type_valid
    check (repository_type in ('plan', 'performance', 'research')),
  constraint public_repository_categories_key_valid
    check (category_key ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  constraint public_repository_categories_label_valid
    check (length(trim(label)) between 1 and 120),
  constraint public_repository_categories_color_valid
    check (color in ('bg-blue-600', 'bg-sky-600', 'bg-cyan-600', 'bg-teal-600', 'bg-emerald-600', 'bg-violet-600', 'bg-orange-500', 'bg-rose-500')),
  constraint public_repository_categories_tone_valid
    check (tone in ('blue', 'emerald', 'violet', 'orange', 'rose')),
  constraint public_repository_categories_sort_order_valid check (sort_order > 0),
  constraint public_repository_categories_type_key_unique unique (repository_type, category_key)
);

create unique index if not exists idx_public_repository_categories_type_label_unique
on public.public_repository_categories (repository_type, lower(trim(label)));

create index if not exists idx_public_repository_categories_listing
on public.public_repository_categories (repository_type, is_active desc, sort_order, created_at);

insert into public.public_repository_categories
  (repository_type, category_key, label, color, tone, sort_order)
values
  ('plan', 'plan-level-1', 'แผนระดับ 1', 'bg-blue-600', 'blue', 10),
  ('plan', 'plan-level-2', 'แผนระดับ 2', 'bg-emerald-600', 'emerald', 20),
  ('plan', 'plan-level-3', 'แผนระดับ 3', 'bg-violet-600', 'violet', 30),
  ('plan', 'executive-policy', 'นโยบายผู้บริหาร', 'bg-orange-500', 'orange', 40),
  ('plan', 'annual-budget-document', 'เอกสารงบประมาณรายจ่ายประจำปี', 'bg-cyan-600', 'blue', 50),
  ('plan', 'action-plan', 'แผนปฏิบัติราชการ', 'bg-teal-600', 'emerald', 60),
  ('plan', 'other', 'อื่น ๆ', 'bg-rose-500', 'rose', 70),
  ('performance', 'key-result', 'ผลการดำเนินงานสำคัญ', 'bg-sky-600', 'blue', 10),
  ('performance', 'annual-report', 'รายงานประจำปี', 'bg-emerald-600', 'emerald', 20),
  ('performance', 'achievement-report', 'รายงานผลสัมฤทธิ์', 'bg-cyan-600', 'blue', 30),
  ('performance', 'risk-management-report', 'รายงานแผนบริหารความเสี่ยง', 'bg-orange-500', 'orange', 40),
  ('performance', 'indicator-report', 'รายงานตัวชี้วัด', 'bg-violet-600', 'violet', 50),
  ('performance', 'other', 'อื่น ๆ', 'bg-rose-500', 'rose', 60),
  ('research', 'r2r', 'งานวิจัยจากงานประจำ (R2R)', 'bg-emerald-600', 'emerald', 10),
  ('research', 'innovation', 'นวัตกรรมและการพัฒนางาน', 'bg-sky-600', 'blue', 20),
  ('research', 'evaluation', 'การประเมินผล', 'bg-violet-600', 'violet', 30),
  ('research', 'other', 'งานวิจัยอื่น ๆ', 'bg-rose-500', 'rose', 40)
on conflict (repository_type, category_key) do nothing;

-- The plan category was originally an enum. Convert it to text so new category keys can be added safely.
alter table public.public_user_plans
  alter column category type text using category::text;

-- Keep the now-unused legacy enum type in place in case an external report still references it.

alter table public.public_performance_results
  drop constraint if exists public_performance_results_category_valid;

alter table public.public_research_items
  drop constraint if exists public_research_items_category_valid;

create or replace function public.validate_public_repository_category()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.public_repository_categories category
    where category.repository_type = tg_argv[0]
      and category.category_key = new.category
  ) then
    raise exception 'Unknown % repository category: %', tg_argv[0], new.category
      using errcode = '23503';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_public_user_plan_category on public.public_user_plans;
create trigger validate_public_user_plan_category
before insert or update of category on public.public_user_plans
for each row execute function public.validate_public_repository_category('plan');

drop trigger if exists validate_public_performance_category on public.public_performance_results;
create trigger validate_public_performance_category
before insert or update of category on public.public_performance_results
for each row execute function public.validate_public_repository_category('performance');

drop trigger if exists validate_public_research_category on public.public_research_items;
create trigger validate_public_research_category
before insert or update of category on public.public_research_items
for each row execute function public.validate_public_repository_category('research');

create or replace function public.prevent_used_public_repository_category_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  category_is_used boolean := false;
begin
  if old.repository_type = 'plan' then
    select exists(select 1 from public.public_user_plans where category = old.category_key)
      into category_is_used;
  elsif old.repository_type = 'performance' then
    select exists(select 1 from public.public_performance_results where category = old.category_key)
      into category_is_used;
  elsif old.repository_type = 'research' then
    select exists(select 1 from public.public_research_items where category = old.category_key)
      into category_is_used;
  end if;

  if category_is_used then
    raise exception 'Category is still referenced by repository records'
      using errcode = '23503';
  end if;
  return old;
end;
$$;

drop trigger if exists prevent_used_public_repository_category_delete on public.public_repository_categories;
create trigger prevent_used_public_repository_category_delete
before delete on public.public_repository_categories
for each row execute function public.prevent_used_public_repository_category_delete();

drop trigger if exists set_public_repository_categories_updated_at on public.public_repository_categories;
create trigger set_public_repository_categories_updated_at
before update on public.public_repository_categories
for each row execute function public.set_updated_at();

alter table public.public_repository_categories enable row level security;

drop policy if exists "repository categories public read active" on public.public_repository_categories;
create policy "repository categories public read active"
on public.public_repository_categories
for select
to anon, authenticated
using (
  is_active
  or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "repository categories admin insert" on public.public_repository_categories;
create policy "repository categories admin insert"
on public.public_repository_categories
for insert
to authenticated
with check (
  public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
  and created_by = auth.uid()
  and updated_by = auth.uid()
);

drop policy if exists "repository categories admin update" on public.public_repository_categories;
create policy "repository categories admin update"
on public.public_repository_categories
for update
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (
  public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
  and updated_by = auth.uid()
);

drop policy if exists "repository categories admin delete" on public.public_repository_categories;
create policy "repository categories admin delete"
on public.public_repository_categories
for delete
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

grant select on public.public_repository_categories to anon;
grant select, insert, update, delete on public.public_repository_categories to authenticated;

notify pgrst, 'reload schema';
