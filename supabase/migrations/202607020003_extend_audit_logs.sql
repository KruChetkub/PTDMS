-- Extend audit logs for long-term compliance archive and Google Sheets export.

alter table public.audit_logs
  add column if not exists actor_user_id uuid references public.profiles(user_id) on delete set null,
  add column if not exists actor_email text,
  add column if not exists actor_name text,
  add column if not exists actor_role text,
  add column if not exists module text,
  add column if not exists route text,
  add column if not exists target_type text,
  add column if not exists target_id text,
  add column if not exists status text not null default 'success',
  add column if not exists error_message text,
  add column if not exists request_id text,
  add column if not exists session_id text,
  add column if not exists before_data jsonb,
  add column if not exists after_data jsonb,
  add column if not exists exported_at timestamptz,
  add column if not exists export_status text not null default 'pending',
  add column if not exists export_batch_id text,
  add column if not exists retry_count integer not null default 0,
  add column if not exists last_export_error text;

update public.audit_logs
set actor_user_id = coalesce(actor_user_id, actor_id),
    target_type = coalesce(target_type, resource_type),
    target_id = coalesce(target_id, resource_id),
    module = coalesce(module, resource_type),
    export_status = coalesce(export_status, 'pending'),
    status = coalesce(status, 'success')
where actor_user_id is null
   or target_type is null
   or target_id is null
   or module is null
   or export_status is null
   or status is null;

create index if not exists idx_audit_logs_actor_user_id on public.audit_logs(actor_user_id);
create index if not exists idx_audit_logs_module on public.audit_logs(module);
create index if not exists idx_audit_logs_action on public.audit_logs(action);
create index if not exists idx_audit_logs_export_status on public.audit_logs(export_status);
create index if not exists idx_audit_logs_exported_at on public.audit_logs(exported_at);

alter table public.audit_logs enable row level security;

drop policy if exists "audit logs insert own activity" on public.audit_logs;
create policy "audit logs insert own activity"
on public.audit_logs
for insert
to authenticated
with check (
  coalesce(actor_user_id, actor_id) = auth.uid()
);

drop policy if exists "audit logs privileged read" on public.audit_logs;
create policy "audit logs privileged read"
on public.audit_logs
for select
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "audit logs super admin read" on public.audit_logs;

-- Updates are intentionally reserved for service-role jobs such as Google Sheets export status updates.

grant insert, select on public.audit_logs to authenticated;
create or replace function public.increment_audit_log_retry_count(p_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.audit_logs
  set retry_count = retry_count + 1
  where id = any(p_ids);
$$;

notify pgrst, 'reload schema';