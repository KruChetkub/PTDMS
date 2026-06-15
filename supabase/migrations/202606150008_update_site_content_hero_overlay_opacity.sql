-- Add hero image overlay opacity for public Home banner brightness control.

update public.site_content_documents
set
  content = jsonb_set(
    content,
    '{heroBanner,imageOverlayOpacity}',
    '58'::jsonb,
    true
  ),
  updated_at = now()
where content_key = 'public-home'
  and not ((content #> '{heroBanner}') ? 'imageOverlayOpacity');
