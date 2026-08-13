-- Add the new plan and performance categories without changing existing records.

alter type public.public_user_plan_category add value if not exists 'annual-budget-document';
alter type public.public_user_plan_category add value if not exists 'action-plan';

alter table public.public_performance_results
  drop constraint if exists public_performance_results_category_valid;

alter table public.public_performance_results
  add constraint public_performance_results_category_valid
  check (category in (
    'key-result',
    'annual-report',
    'achievement-report',
    'risk-management-report',
    'indicator-report',
    'other'
  ));

notify pgrst, 'reload schema';
