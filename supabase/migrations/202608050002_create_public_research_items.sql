-- User-submitted research items for the public research repository.
-- Existing R2R cards in site_content_documents remain untouched.

create table if not exists public.public_research_items (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(user_id) on delete restrict,
  owner_name text not null default '',
  owner_work_group text,
  category text not null default 'r2r',
  publication_year smallint not null,
  sort_order integer not null default 10,
  title text not null,
  researcher_names text not null default '',
  organization text not null default '',
  abstract text not null default '',
  icon_key text not null default 'file',
  color text not null default 'bg-emerald-600',
  action_label text not null default 'เปิดเอกสารงานวิจัย',
  pdf_url text not null default '',
  cover_image_url text not null default '',
  cover_image_layout text not null default 'portrait',
  status public.site_content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_research_items_title_not_blank check (length(trim(title)) > 0),
  constraint public_research_items_category_valid check (category in ('r2r', 'innovation', 'evaluation', 'other')),
  constraint public_research_items_publication_year_valid check (publication_year between 2400 and 2700),
  constraint public_research_items_sort_order_valid check (sort_order > 0),
  constraint public_research_items_cover_layout_valid check (cover_image_layout in ('portrait', 'landscape')),
  constraint public_research_items_pdf_url_safe check (pdf_url = '' or pdf_url ~* '^https?://'),
  constraint public_research_items_cover_url_safe check (cover_image_url = '' or cover_image_url ~* '^https?://')
);

create table if not exists public.public_research_item_history (
  id uuid primary key default gen_random_uuid(),
  research_item_id uuid not null,
  action text not null,
  snapshot jsonb not null,
  actor_id uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  constraint public_research_item_history_action_valid check (action in ('created', 'updated'))
);

create index if not exists idx_public_research_items_public_listing
on public.public_research_items (status, publication_year desc, category, sort_order, updated_at desc);
create index if not exists idx_public_research_items_owner_updated
on public.public_research_items (owner_user_id, updated_at desc);
create index if not exists idx_public_research_item_history_item_created
on public.public_research_item_history (research_item_id, created_at desc);

drop trigger if exists set_public_research_items_updated_at on public.public_research_items;
create trigger set_public_research_items_updated_at
before update on public.public_research_items
for each row execute function public.set_updated_at();

create or replace function public.capture_public_research_item_history()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.public_research_item_history (research_item_id, action, snapshot, actor_id)
  values (new.id, case when tg_op = 'INSERT' then 'created' else 'updated' end, to_jsonb(new), auth.uid());
  return new;
end;
$$;

drop trigger if exists capture_public_research_item_history on public.public_research_items;
create trigger capture_public_research_item_history
after insert or update on public.public_research_items
for each row execute function public.capture_public_research_item_history();

alter table public.public_research_items enable row level security;
alter table public.public_research_item_history enable row level security;

drop policy if exists "research items read published or own" on public.public_research_items;
create policy "research items read published or own" on public.public_research_items
for select to anon, authenticated
using (status = 'published' or owner_user_id = auth.uid() or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "research items insert own" on public.public_research_items;
create policy "research items insert own" on public.public_research_items
for insert to authenticated with check (owner_user_id = auth.uid());

drop policy if exists "research items update own" on public.public_research_items;
create policy "research items update own" on public.public_research_items
for update to authenticated
using (owner_user_id = auth.uid() or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (owner_user_id = auth.uid() or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "research item history admin read" on public.public_research_item_history;
create policy "research item history admin read" on public.public_research_item_history
for select to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

grant select on public.public_research_items to anon;
grant select, insert, update on public.public_research_items to authenticated;
grant select on public.public_research_item_history to authenticated;
