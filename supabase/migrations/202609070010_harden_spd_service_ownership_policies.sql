-- Security Hardening Plan 1.4.
-- Enforce ticket ownership and workflow state in the database. Client-supplied
-- actor_id, requester_id, ticket_id, and status values are not trusted alone.

begin;

drop policy if exists "spd service timeline admin insert"
on public.spd_service_ticket_timeline;

drop policy if exists "spd service timeline authorized insert"
on public.spd_service_ticket_timeline;

create policy "spd service timeline authorized insert"
on public.spd_service_ticket_timeline
for insert
to authenticated
with check (
  actor_id = auth.uid()
  and (
    private.is_privileged_role_impl(
      array['super_admin', 'admin']::public.user_role[]
    )
    or (
      action = 'CREATE_TICKET'
      and from_status is null
      and to_status = 'NEW'::public.spd_service_ticket_status
      and exists (
        select 1
        from public.spd_service_tickets ticket
        where ticket.id = public.spd_service_ticket_timeline.ticket_id
          and ticket.requester_id = auth.uid()
          and ticket.status = 'NEW'::public.spd_service_ticket_status
      )
    )
  )
);

drop policy if exists "spd service surveys requester insert"
on public.spd_service_satisfaction_surveys;

create policy "spd service surveys requester insert"
on public.spd_service_satisfaction_surveys
for insert
to authenticated
with check (
  requester_id = auth.uid()
  and exists (
    select 1
    from public.spd_service_tickets ticket
    where ticket.id = public.spd_service_satisfaction_surveys.ticket_id
      and ticket.requester_id = auth.uid()
      and ticket.status = 'COMPLETED'::public.spd_service_ticket_status
  )
);

notify pgrst, 'reload schema';

commit;
