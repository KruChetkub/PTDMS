-- Reuse repository category management for configurable Home sections.

alter table public.public_repository_categories
  drop constraint if exists public_repository_categories_type_valid;

alter table public.public_repository_categories
  add constraint public_repository_categories_type_valid
  check (repository_type in ('plan', 'performance', 'research', 'home'));

insert into public.public_repository_categories
  (repository_type, category_key, label, color, tone, sort_order)
values
  ('home', 'plan', 'แผนระดับต่าง ๆ', 'bg-emerald-600', 'emerald', 10),
  ('home', 'policy', 'นโยบายและการดำเนินงาน', 'bg-blue-600', 'blue', 20)
on conflict (repository_type, category_key) do nothing;

alter table public.public_home_content_items
  drop constraint if exists public_home_content_section_valid;

create or replace function public.validate_public_home_section()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.public_repository_categories category
    where category.repository_type = 'home'
      and category.category_key = new.section
  ) then
    raise exception 'Unknown Home section: %', new.section using errcode = '23503';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_public_home_content_section on public.public_home_content_items;
create trigger validate_public_home_content_section
before insert or update of section on public.public_home_content_items
for each row execute function public.validate_public_home_section();

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
    select exists(select 1 from public.public_user_plans where category = old.category_key) into category_is_used;
  elsif old.repository_type = 'performance' then
    select exists(select 1 from public.public_performance_results where category = old.category_key) into category_is_used;
  elsif old.repository_type = 'research' then
    select exists(select 1 from public.public_research_items where category = old.category_key) into category_is_used;
  elsif old.repository_type = 'home' then
    select exists(select 1 from public.public_home_content_items where section = old.category_key) into category_is_used;
  end if;

  if category_is_used then
    raise exception 'Category is still referenced by repository records' using errcode = '23503';
  end if;
  return old;
end;
$$;

notify pgrst, 'reload schema';
