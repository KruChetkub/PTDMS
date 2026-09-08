-- Detect repeated or distributed login failures and surface durable alerts to
-- Super Admins. Detection runs in the database so it does not depend on the
-- Security page being open.

begin;

create table if not exists public.security_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null check (alert_type in (
    'repeated_ip_failures',
    'repeated_account_failures',
    'credential_stuffing',
    'success_after_failures'
  )),
  severity text not null check (severity in ('warning', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  fingerprint text not null,
  title text not null,
  description text not null,
  source_ip text,
  target_email text,
  attempt_count integer not null default 1 check (attempt_count > 0),
  window_started_at timestamptz not null,
  last_detected_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles(user_id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint security_alerts_source_ip_length check (source_ip is null or length(source_ip) <= 100),
  constraint security_alerts_target_email_length check (target_email is null or length(target_email) <= 254)
);

create unique index if not exists idx_security_alerts_open_fingerprint
on public.security_alerts (fingerprint)
where status = 'open';

create index if not exists idx_security_alerts_status_last_detected
on public.security_alerts (status, last_detected_at desc);

alter table public.security_alerts enable row level security;

drop policy if exists "security alerts super admin read" on public.security_alerts;
create policy "security alerts super admin read"
on public.security_alerts
for select
to authenticated
using (
  private.is_privileged_role_impl(
    array['super_admin']::public.user_role[]
  )
);

drop policy if exists "security alerts super admin acknowledge" on public.security_alerts;
create policy "security alerts super admin acknowledge"
on public.security_alerts
for update
to authenticated
using (
  private.is_privileged_role_impl(
    array['super_admin']::public.user_role[]
  )
)
with check (
  private.is_privileged_role_impl(
    array['super_admin']::public.user_role[]
  )
);

revoke all on table public.security_alerts from public, anon, authenticated;
grant select, update on table public.security_alerts to authenticated;
grant select, insert, update, delete on table public.security_alerts to service_role;

create or replace function private.detect_login_anomaly_impl()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(coalesce(new.actor_email, new.metadata ->> 'email', ''));
  v_failure_count bigint := 0;
  v_distinct_accounts bigint := 0;
  v_window_started_at timestamptz;
  v_severity text;
begin
  if new.module is distinct from 'auth'
    or new.action not in ('login', 'login_failed')
  then
    return new;
  end if;

  if new.action = 'login_failed' then
    if new.ip_address is not null then
      select count(*), min(log.created_at), count(distinct nullif(lower(coalesce(log.actor_email, log.metadata ->> 'email', '')), ''))
      into v_failure_count, v_window_started_at, v_distinct_accounts
      from public.audit_logs log
      where log.module = 'auth'
        and log.action = 'login_failed'
        and log.status = 'fail'
        and log.ip_address = new.ip_address
        and log.created_at >= new.created_at - interval '10 minutes';

      if v_failure_count >= 5 then
        v_severity := case when v_failure_count >= 10 then 'critical' else 'high' end;

        insert into public.security_alerts (
          alert_type, severity, fingerprint, title, description,
          source_ip, attempt_count, window_started_at, last_detected_at, metadata
        ) values (
          'repeated_ip_failures',
          v_severity,
          'repeated_ip_failures:' || new.ip_address,
          'Repeated login failures from one IP address',
          'Multiple failed login attempts were detected from the same IP address within 10 minutes.',
          new.ip_address,
          v_failure_count::integer,
          coalesce(v_window_started_at, new.created_at),
          new.created_at,
          jsonb_build_object('window_minutes', 10)
        )
        on conflict (fingerprint) where status = 'open' do update
        set severity = excluded.severity,
            attempt_count = excluded.attempt_count,
            window_started_at = least(public.security_alerts.window_started_at, excluded.window_started_at),
            last_detected_at = excluded.last_detected_at,
            updated_at = now();
      end if;

      if v_distinct_accounts >= 3 then
        v_severity := case when v_distinct_accounts >= 5 then 'critical' else 'high' end;

        insert into public.security_alerts (
          alert_type, severity, fingerprint, title, description,
          source_ip, attempt_count, window_started_at, last_detected_at, metadata
        ) values (
          'credential_stuffing',
          v_severity,
          'credential_stuffing:' || new.ip_address,
          'Multiple accounts targeted from one IP address',
          'Failed login attempts against several accounts were detected from the same IP address.',
          new.ip_address,
          v_failure_count::integer,
          coalesce(v_window_started_at, new.created_at),
          new.created_at,
          jsonb_build_object('window_minutes', 10, 'distinct_accounts', v_distinct_accounts)
        )
        on conflict (fingerprint) where status = 'open' do update
        set severity = excluded.severity,
            attempt_count = excluded.attempt_count,
            last_detected_at = excluded.last_detected_at,
            metadata = excluded.metadata,
            updated_at = now();
      end if;
    end if;

    if v_email <> '' then
      select count(*), min(log.created_at)
      into v_failure_count, v_window_started_at
      from public.audit_logs log
      where log.module = 'auth'
        and log.action = 'login_failed'
        and log.status = 'fail'
        and lower(coalesce(log.actor_email, log.metadata ->> 'email', '')) = v_email
        and log.created_at >= new.created_at - interval '10 minutes';

      if v_failure_count >= 5 then
        v_severity := case when v_failure_count >= 10 then 'critical' else 'high' end;

        insert into public.security_alerts (
          alert_type, severity, fingerprint, title, description,
          target_email, attempt_count, window_started_at, last_detected_at, metadata
        ) values (
          'repeated_account_failures',
          v_severity,
          'repeated_account_failures:' || v_email,
          'Repeated login failures for one account',
          'Multiple failed login attempts were detected for the same account within 10 minutes.',
          v_email,
          v_failure_count::integer,
          coalesce(v_window_started_at, new.created_at),
          new.created_at,
          jsonb_build_object('window_minutes', 10)
        )
        on conflict (fingerprint) where status = 'open' do update
        set severity = excluded.severity,
            attempt_count = excluded.attempt_count,
            window_started_at = least(public.security_alerts.window_started_at, excluded.window_started_at),
            last_detected_at = excluded.last_detected_at,
            updated_at = now();
      end if;
    end if;
  elsif new.action = 'login' and v_email <> '' then
    select count(*), min(log.created_at)
    into v_failure_count, v_window_started_at
    from public.audit_logs log
    where log.module = 'auth'
      and log.action = 'login_failed'
      and log.status = 'fail'
      and lower(coalesce(log.actor_email, log.metadata ->> 'email', '')) = v_email
      and log.created_at >= new.created_at - interval '30 minutes'
      and log.created_at < new.created_at;

    if v_failure_count >= 5 then
      insert into public.security_alerts (
        alert_type, severity, fingerprint, title, description,
        source_ip, target_email, attempt_count,
        window_started_at, last_detected_at, metadata
      ) values (
        'success_after_failures',
        'critical',
        'success_after_failures:' || v_email,
        'Successful login after repeated failures',
        'A successful login occurred shortly after repeated failed attempts against the same account.',
        new.ip_address,
        v_email,
        v_failure_count::integer,
        coalesce(v_window_started_at, new.created_at),
        new.created_at,
        jsonb_build_object('window_minutes', 30)
      )
      on conflict (fingerprint) where status = 'open' do update
      set severity = excluded.severity,
          source_ip = excluded.source_ip,
          attempt_count = excluded.attempt_count,
          last_detected_at = excluded.last_detected_at,
          updated_at = now();
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.detect_login_anomaly_impl()
from public, anon, authenticated;

drop trigger if exists detect_login_anomaly on public.audit_logs;
create trigger detect_login_anomaly
after insert on public.audit_logs
for each row execute function private.detect_login_anomaly_impl();

notify pgrst, 'reload schema';

commit;
