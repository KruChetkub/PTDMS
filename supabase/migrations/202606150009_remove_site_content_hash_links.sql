-- Store Home section targets without hash prefixes.

update public.site_content_documents
set
  content = jsonb_set(
    content,
    '{heroBanner,secondaryActionHref}',
    '"plan-levels"'::jsonb,
    true
  ),
  updated_at = now()
where content_key = 'public-home'
  and content #>> '{heroBanner,secondaryActionHref}' = '#plan-levels';
