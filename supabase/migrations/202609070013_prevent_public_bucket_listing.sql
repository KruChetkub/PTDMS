-- Security Hardening Plan 1.10.
-- Public object URLs do not require a broad SELECT policy. Keep object
-- metadata/listing available only to authorized site-content administrators.

begin;

drop policy if exists "site content assets public read"
on storage.objects;

drop policy if exists "site content assets admin read"
on storage.objects;

create policy "site content assets admin read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'site-content-assets'
  and private.is_privileged_role_impl(
    array['super_admin', 'admin']::public.user_role[]
  )
);

commit;
