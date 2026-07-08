-- Add Digital Service request guide settings and private image storage.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'spd-service-request-guides',
  'spd-service-request-guides',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "spd service request guides public read" on storage.objects;
drop policy if exists "spd service request guides authenticated read" on storage.objects;
create policy "spd service request guides authenticated read"
on storage.objects
for select
to authenticated
using (bucket_id = 'spd-service-request-guides');

drop policy if exists "spd service request guides admin insert" on storage.objects;
create policy "spd service request guides admin insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'spd-service-request-guides'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "spd service request guides admin update" on storage.objects;
create policy "spd service request guides admin update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'spd-service-request-guides'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
)
with check (
  bucket_id = 'spd-service-request-guides'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "spd service request guides admin delete" on storage.objects;
create policy "spd service request guides admin delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'spd-service-request-guides'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

insert into public.spd_service_notification_settings (setting_key, setting_value, is_secret, is_active)
values (
  'digital_service_request_guides',
  '[{"subject":"ลงข้อมูลหน้า Website","enabled":true,"imagePath":""},{"subject":"ลงข่าวประชาสัมพันธ์","enabled":true,"imagePath":""}]',
  false,
  true
)
on conflict (setting_key) do nothing;

drop policy if exists "spd service request guide settings active users read" on public.spd_service_notification_settings;
create policy "spd service request guide settings active users read"
on public.spd_service_notification_settings
for select
to authenticated
using (
  setting_key = 'digital_service_request_guides'
  and is_active = true
  and public.current_user_role() is not null
);
