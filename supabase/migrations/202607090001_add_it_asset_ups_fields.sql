-- Add UPS asset fields for IT asset management form.

alter table public.it_assets
  add column if not exists ups_asset_code text,
  add column if not exists ups_received_date date,
  add column if not exists ups_received_date_raw text;