-- Keep uploads restricted by the existing site-content-assets admin policies.

update storage.buckets
set
  file_size_limit = greatest(coalesce(file_size_limit, 0), 52428800),
  allowed_mime_types = (
    select array_agg(distinct mime_type)
    from unnest(coalesce(allowed_mime_types, array[]::text[]) || array['application/pdf', 'image/jpeg']) as mime_type
  )
where id = 'site-content-assets';
