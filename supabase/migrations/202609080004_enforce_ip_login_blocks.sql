-- Automatically block IP addresses that exceed the configured failed-login
-- threshold. Super Admins can maintain explicit allow/block rules from the
-- Security page; active allow rules always take precedence over automation.

begin;

create table if not exists public.login_ip_block_settings (
  singleton_id smallint primary key default 1 check (singleton_id = 1),
  enabled boolean not null default true,
  attempt_limit integer not null default 10 check (attempt_limit between 3 and 100),
  window_minutes integer not null default 5 check (window_minutes between 1 and 1440),
  permanent_block boolean not null default true,
  auto_unblock_days integer not null default 1 check (auto_unblock_days between 1 and 365),
  updated_by uuid references public.profiles(user_id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.login_ip_block_settings (singleton_id)
values (1)
on conflict (singleton_id) do nothing;

create table if not exists public.login_ip_rules (
  id uuid primary key default gen_random_uuid(),
  ip_address inet not null unique,
  rule_type text not null check (rule_type in ('allow', 'block')),
  source text not null default 'manual' check (source in ('automatic', 'manual')),
  is_active boolean not null default true,
  reason text not null default '',
  failed_attempt_count integer not null default 0 check (failed_attempt_count >= 0),
  blocked_at timestamptz,
  expires_at timestamptz,
  created_by uuid references public.profiles(user_id) on delete set null,
  updated_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint login_ip_rules_reason_length check (length(reason) <= 500),
  constraint login_ip_rules_blocked_at_required check (
    rule_type <> 'block' or blocked_at is not null
  )
);

create index if not exists idx_login_ip_rules_active_type
on public.login_ip_rules (is_active, rule_type, updated_at desc);

alter table public.login_ip_block_settings enable row level security;
alter table public.login_ip_rules enable row level security;

drop policy if exists "login IP settings super admin manage"
on public.login_ip_block_settings;
create policy "login IP settings super admin manage"
on public.login_ip_block_settings
for all
to authenticated
using (
  private.is_privileged_role_impl(
    array['super_admin']::public.user_role[]
  )
  and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
)
with check (
  private.is_privileged_role_impl(
    array['super_admin']::public.user_role[]
  )
  and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
);

drop policy if exists "login IP rules super admin manage"
on public.login_ip_rules;
create policy "login IP rules super admin manage"
on public.login_ip_rules
for all
to authenticated
using (
  private.is_privileged_role_impl(
    array['super_admin']::public.user_role[]
  )
  and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
)
with check (
  private.is_privileged_role_impl(
    array['super_admin']::public.user_role[]
  )
  and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
);

revoke all on table public.login_ip_block_settings
from public, anon, authenticated;
revoke all on table public.login_ip_rules
from public, anon, authenticated;
grant select, insert, update, delete on table public.login_ip_block_settings
to authenticated, service_role;
grant select, insert, update, delete on table public.login_ip_rules
to authenticated, service_role;

create or replace function private.enforce_login_ip_block_impl()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.login_ip_block_settings%rowtype;
  v_ip inet;
  v_failure_count bigint;
  v_expires_at timestamptz;
begin
  if new.module is distinct from 'auth'
    or new.action is distinct from 'login_failed'
    or new.status is distinct from 'fail'
    or new.ip_address is null
  then
    return new;
  end if;

  begin
    v_ip := new.ip_address::inet;
  exception when invalid_text_representation then
    return new;
  end;

  select settings.*
  into v_settings
  from public.login_ip_block_settings settings
  where settings.singleton_id = 1;

  if not found or not v_settings.enabled then
    return new;
  end if;

  if exists (
    select 1
    from public.login_ip_rules rule
    where rule.ip_address = v_ip
      and rule.rule_type = 'allow'
      and rule.is_active
      and (rule.expires_at is null or rule.expires_at > new.created_at)
  ) then
    return new;
  end if;

  select count(*)
  into v_failure_count
  from public.audit_logs log
  where log.module = 'auth'
    and log.action = 'login_failed'
    and log.status = 'fail'
    and log.ip_address = new.ip_address
    and log.created_at >= new.created_at
      - pg_catalog.make_interval(mins => v_settings.window_minutes);

  if v_failure_count < v_settings.attempt_limit then
    return new;
  end if;

  v_expires_at := case
    when v_settings.permanent_block then null
    else new.created_at + pg_catalog.make_interval(days => v_settings.auto_unblock_days)
  end;

  insert into public.login_ip_rules (
    ip_address,
    rule_type,
    source,
    is_active,
    reason,
    failed_attempt_count,
    blocked_at,
    expires_at,
    updated_at
  )
  values (
    v_ip,
    'block',
    'automatic',
    true,
    'Exceeded failed login threshold',
    v_failure_count::integer,
    new.created_at,
    v_expires_at,
    now()
  )
  on conflict (ip_address) do update
  set
    rule_type = 'block',
    source = 'automatic',
    is_active = true,
    reason = excluded.reason,
    failed_attempt_count = excluded.failed_attempt_count,
    blocked_at = excluded.blocked_at,
    expires_at = excluded.expires_at,
    updated_by = null,
    updated_at = now()
  where not (
    public.login_ip_rules.rule_type = 'allow'
    and public.login_ip_rules.is_active
    and (
      public.login_ip_rules.expires_at is null
      or public.login_ip_rules.expires_at > new.created_at
    )
  );

  return new;
end;
$$;

revoke all on function private.enforce_login_ip_block_impl()
from public, anon, authenticated;

drop trigger if exists enforce_login_ip_block on public.audit_logs;
create trigger enforce_login_ip_block
after insert on public.audit_logs
for each row execute function private.enforce_login_ip_block_impl();

notify pgrst, 'reload schema';

commit;
