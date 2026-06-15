-- Create public storage for website assets and add brand settings to Home content.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-content-assets',
  'site-content-assets',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "site content assets public read" on storage.objects;
create policy "site content assets public read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'site-content-assets');

drop policy if exists "site content assets admin insert" on storage.objects;
create policy "site content assets admin insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'site-content-assets'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "site content assets admin update" on storage.objects;
create policy "site content assets admin update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'site-content-assets'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
)
with check (
  bucket_id = 'site-content-assets'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "site content assets admin delete" on storage.objects;
create policy "site content assets admin delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'site-content-assets'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

update public.site_content_documents
set
  content = jsonb_set(
    content,
    '{brandSettings}',
    '{
      "siteName": "SmartSPD",
      "logoUrl": "/SPDLogo.svg"
    }'::jsonb,
    true
  ),
  updated_at = now()
where content_key = 'public-home'
  and not (content ? 'brandSettings');
