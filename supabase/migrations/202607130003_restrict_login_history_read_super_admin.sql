-- Restrict login history reads to Super Admin only.
-- The Security page is already limited to super_admin, so database policy should match it.

alter table public.login_history enable row level security;

drop policy if exists "login history privileged read" on public.login_history;
drop policy if exists "login history super admin read" on public.login_history;

create policy "login history super admin read"
on public.login_history
for select
to authenticated
using (public.is_privileged_role(array['super_admin']::public.user_role[]));