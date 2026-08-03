-- Keep existing public_user_plans installs compatible with the new plan category set.

alter type public.public_user_plan_category add value if not exists 'plan-level-1';
alter type public.public_user_plan_category add value if not exists 'plan-level-2';
alter type public.public_user_plan_category add value if not exists 'plan-level-3';
alter type public.public_user_plan_category add value if not exists 'other';