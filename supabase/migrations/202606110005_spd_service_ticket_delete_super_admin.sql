-- Allow deleting SPD Service tickets only for Super Admin.

drop policy if exists "spd service tickets super admin delete" on public.spd_service_tickets;

create policy "spd service tickets super admin delete"
on public.spd_service_tickets
for delete
to authenticated
using (public.is_privileged_role(array['super_admin']::public.user_role[]));

grant delete on public.spd_service_tickets to authenticated;
