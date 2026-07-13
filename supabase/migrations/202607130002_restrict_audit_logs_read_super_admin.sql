-- Restrict audit log reads to Super Admin only.
-- This keeps frontend route protection and database RLS aligned for /admin/security.

alter table public.audit_logs enable row level security;

drop policy if exists "audit logs privileged read" on public.audit_logs;
drop policy if exists "audit logs super admin read" on public.audit_logs;

create policy "audit logs super admin read"
on public.audit_logs
for select
to authenticated
using (public.is_privileged_role(array['super_admin']::public.user_role[]));