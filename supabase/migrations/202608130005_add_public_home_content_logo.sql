-- Optional circular logo for each Home content item.

alter table public.public_home_content_items
  add column if not exists logo_url text not null default '';

alter table public.public_home_content_items
  drop constraint if exists public_home_content_logo_url_valid;

alter table public.public_home_content_items
  add constraint public_home_content_logo_url_valid check (
    logo_url = ''
    or (
      length(logo_url) <= 2048
      and logo_url ~* '^https?://[^[:space:]]+$'
    )
  );

notify pgrst, 'reload schema';
