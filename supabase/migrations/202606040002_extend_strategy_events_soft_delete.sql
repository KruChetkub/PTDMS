-- Add soft-delete audit fields for strategy events that were created before this enhancement.

alter table public.strategy_events
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.profiles(user_id) on delete set null;

create index if not exists idx_strategy_events_cancelled_by on public.strategy_events(cancelled_by);

notify pgrst, 'reload schema';
