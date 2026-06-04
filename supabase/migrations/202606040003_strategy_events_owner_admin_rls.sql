-- Tighten strategy event management rights:
-- personnel can update only their own events; super_admin/admin can manage all.

drop policy if exists "strategy events update own or admin" on public.strategy_events;
create policy "strategy events update own or admin"
on public.strategy_events
for update
to authenticated
using (
  created_by = auth.uid()
  or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
)
with check (
  created_by = auth.uid()
  or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "strategy events delete admin" on public.strategy_events;
create policy "strategy events delete admin"
on public.strategy_events
for delete
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

notify pgrst, 'reload schema';
