-- Add per-user permissions and grant finance officers access to budget item management only.

begin;

create table if not exists public.permissions (
  permission_key text primary key check (char_length(btrim(permission_key)) between 1 and 160),
  label text not null check (char_length(btrim(label)) between 1 and 200),
  module text not null check (char_length(btrim(module)) between 1 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role public.user_role not null,
  permission_key text not null references public.permissions(permission_key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role, permission_key)
);

create table if not exists public.user_permission_overrides (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  permission_key text not null references public.permissions(permission_key) on delete cascade,
  allowed boolean not null default true,
  granted_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, permission_key)
);

create index if not exists idx_user_permission_overrides_permission
on public.user_permission_overrides(permission_key, allowed);

drop trigger if exists set_user_permission_overrides_updated_at
on public.user_permission_overrides;
create trigger set_user_permission_overrides_updated_at
before update on public.user_permission_overrides
for each row execute function public.set_updated_at();

insert into public.permissions (permission_key, label, module)
values (
  'budget_utilization.items.manage',
  'จัดการรายการงบประมาณ',
  'budget_utilization'
)
on conflict (permission_key) do update
set label = excluded.label,
    module = excluded.module;

insert into public.role_permissions (role, permission_key)
values
  ('super_admin', 'budget_utilization.items.manage'),
  ('admin', 'budget_utilization.items.manage')
on conflict (role, permission_key) do nothing;

create or replace function public.has_permission(p_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with active_profile as (
    select role
    from public.profiles
    where user_id = auth.uid()
      and status = 'active'
    limit 1
  )
  select coalesce(
    exists(select 1 from active_profile)
    and coalesce(
      (
        select user_override.allowed
        from public.user_permission_overrides user_override
        where user_override.user_id = auth.uid()
          and user_override.permission_key = p_permission_key
      ),
      exists (
        select 1
        from public.role_permissions role_permission
        join active_profile on active_profile.role = role_permission.role
        where role_permission.permission_key = p_permission_key
      )
    ),
    false
  );
$$;

create or replace function public.list_my_permissions()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array_agg(permission.permission_key order by permission.permission_key)
      filter (where public.has_permission(permission.permission_key)),
    array[]::text[]
  )
  from public.permissions permission;
$$;

create or replace function public.list_user_permission_assignments(p_permission_key text)
returns uuid[]
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_privileged_role(array['super_admin']::public.user_role[]) then
    raise exception 'Only super administrators can list user permission assignments'
      using errcode = '42501';
  end if;

  return coalesce(
    (
      select array_agg(user_override.user_id order by user_override.user_id)
      from public.user_permission_overrides user_override
      where user_override.permission_key = p_permission_key
        and user_override.allowed
    ),
    array[]::uuid[]
  );
end;
$$;

create or replace function public.set_user_permission(
  p_target_user_id uuid,
  p_permission_key text,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role public.user_role;
begin
  if not public.is_privileged_role(array['super_admin']::public.user_role[]) then
    raise exception 'Only super administrators can assign user permissions'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.permissions where permission_key = p_permission_key
  ) then
    raise exception 'Unknown permission: %', p_permission_key
      using errcode = '22023';
  end if;

  select profile.role
  into target_role
  from public.profiles profile
  where profile.user_id = p_target_user_id;

  if target_role is null then
    raise exception 'User profile not found' using errcode = 'P0002';
  end if;

  if p_enabled and target_role <> 'personnel'::public.user_role then
    raise exception 'Supplemental permissions can only be assigned to personnel users'
      using errcode = '22023';
  end if;

  if p_enabled then
    insert into public.user_permission_overrides (
      user_id,
      permission_key,
      allowed,
      granted_by
    )
    values (
      p_target_user_id,
      p_permission_key,
      true,
      auth.uid()
    )
    on conflict (user_id, permission_key) do update
    set allowed = true,
        granted_by = auth.uid(),
        updated_at = now();
  else
    delete from public.user_permission_overrides
    where user_id = p_target_user_id
      and permission_key = p_permission_key;
  end if;

  insert into public.audit_logs (
    actor_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    auth.uid(),
    case when p_enabled then 'user_permission_granted' else 'user_permission_revoked' end,
    'user_permission',
    p_target_user_id::text,
    jsonb_build_object('permission_key', p_permission_key, 'enabled', p_enabled)
  );
end;
$$;

alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_permission_overrides enable row level security;

drop policy if exists "permissions read authenticated" on public.permissions;
create policy "permissions read authenticated"
on public.permissions
for select to authenticated
using (public.current_user_role() is not null);

drop policy if exists "role permissions read authenticated" on public.role_permissions;
create policy "role permissions read authenticated"
on public.role_permissions
for select to authenticated
using (public.current_user_role() is not null);

drop policy if exists "user permission overrides read own or super admin"
on public.user_permission_overrides;
create policy "user permission overrides read own or super admin"
on public.user_permission_overrides
for select to authenticated
using (
  user_id = auth.uid()
  or public.is_privileged_role(array['super_admin']::public.user_role[])
);

grant select on public.permissions to authenticated;
grant select on public.role_permissions to authenticated;
grant select on public.user_permission_overrides to authenticated;

revoke all on function public.has_permission(text) from public, anon;
revoke all on function public.list_my_permissions() from public, anon;
revoke all on function public.list_user_permission_assignments(text) from public, anon;
revoke all on function public.set_user_permission(uuid, text, boolean) from public, anon;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.list_my_permissions() to authenticated;
grant execute on function public.list_user_permission_assignments(text) to authenticated;
grant execute on function public.set_user_permission(uuid, text, boolean) to authenticated;

drop policy if exists "budget report periods write admin roles"
on public.budget_utilization_report_periods;
create policy "budget report periods write admin roles"
on public.budget_utilization_report_periods
for all to authenticated
using (public.has_permission('budget_utilization.items.manage'))
with check (public.has_permission('budget_utilization.items.manage'));

drop policy if exists "budget items write admin roles"
on public.budget_utilization_items;
create policy "budget items write admin roles"
on public.budget_utilization_items
for all to authenticated
using (public.has_permission('budget_utilization.items.manage'))
with check (public.has_permission('budget_utilization.items.manage'));

drop policy if exists "budget amounts write admin roles"
on public.budget_utilization_amounts;
create policy "budget amounts write admin roles"
on public.budget_utilization_amounts
for all to authenticated
using (public.has_permission('budget_utilization.items.manage'))
with check (public.has_permission('budget_utilization.items.manage'));

drop policy if exists "budget allocation tranches write admin roles"
on public.budget_utilization_allocation_tranches;
create policy "budget allocation tranches write admin roles"
on public.budget_utilization_allocation_tranches
for all to authenticated
using (public.has_permission('budget_utilization.items.manage'))
with check (public.has_permission('budget_utilization.items.manage'));

drop policy if exists "budget item allocations write admin roles"
on public.budget_utilization_item_allocations;
create policy "budget item allocations write admin roles"
on public.budget_utilization_item_allocations
for all to authenticated
using (public.has_permission('budget_utilization.items.manage'))
with check (public.has_permission('budget_utilization.items.manage'));

drop policy if exists "budget transaction references write admin roles"
on public.budget_utilization_transaction_references;
create policy "budget transaction references write admin roles"
on public.budget_utilization_transaction_references
for all to authenticated
using (public.has_permission('budget_utilization.items.manage'))
with check (public.has_permission('budget_utilization.items.manage'));

notify pgrst, 'reload schema';

commit;
