-- Store user manuals shown on the authenticated portal page.

create table if not exists public.portal_user_manuals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  pdf_url text not null,
  pdf_path text,
  is_active boolean not null default true,
  sort_order integer not null default 10,
  updated_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_portal_user_manuals_active_order
on public.portal_user_manuals (is_active, sort_order, title);

alter table public.portal_user_manuals enable row level security;

drop policy if exists "portal user manuals authenticated read active" on public.portal_user_manuals;
create policy "portal user manuals authenticated read active"
on public.portal_user_manuals
for select
to authenticated
using (is_active = true or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "portal user manuals admin manage" on public.portal_user_manuals;
create policy "portal user manuals admin manage"
on public.portal_user_manuals
for all
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

create or replace function public.set_portal_user_manuals_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_portal_user_manuals_updated_at on public.portal_user_manuals;
create trigger set_portal_user_manuals_updated_at
before update on public.portal_user_manuals
for each row
execute function public.set_portal_user_manuals_updated_at();

-- Allow PDF uploads to the existing site content bucket used by Site Manager.
update storage.buckets
set
  file_size_limit = greatest(coalesce(file_size_limit, 0), 20971520),
  allowed_mime_types = (
    select array_agg(distinct mime_type)
    from unnest(coalesce(allowed_mime_types, array[]::text[]) || array['application/pdf']) as mime_type
  )
where id = 'site-content-assets';
