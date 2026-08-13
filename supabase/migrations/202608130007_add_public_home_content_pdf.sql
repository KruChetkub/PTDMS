-- Optional PDF document for each configurable Home content item.

alter table public.public_home_content_items
  add column if not exists pdf_url text not null default '';

alter table public.public_home_content_items
  drop constraint if exists public_home_content_pdf_url_valid;

alter table public.public_home_content_items
  add constraint public_home_content_pdf_url_valid check (
    pdf_url = ''
    or (
      length(pdf_url) <= 2048
      and pdf_url ~* '^https?://[^[:space:]]+$'
    )
  );

notify pgrst, 'reload schema';
