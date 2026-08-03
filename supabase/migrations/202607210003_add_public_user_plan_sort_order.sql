-- Add stable display order inside each public user plan category.

alter table public.public_user_plans
add column if not exists sort_order integer not null default 10;

create index if not exists idx_public_user_plans_status_category_sort_order
on public.public_user_plans (status, category, sort_order, updated_at desc);