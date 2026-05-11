-- PTDMS Auth + RBAC foundation
-- Apply this migration to a Supabase project before testing Phase 1 authentication.

create extension if not exists "pgcrypto";

do $$
begin
  create type public.user_role as enum ('super_admin', 'admin', 'executive', 'hr', 'personnel');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.profile_status as enum ('active', 'inactive', 'suspended');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  employee_code text unique,
  full_name text not null default '',
  position text,
  department text,
  role public.user_role not null default 'personnel',
  status public.profile_status not null default 'active',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(user_id) on delete set null,
  login_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  success boolean not null default true
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(user_id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_status on public.profiles(status);
create index if not exists idx_profiles_department on public.profiles(department);
create index if not exists idx_login_history_user_id on public.login_history(user_id);
create index if not exists idx_audit_logs_actor_id on public.audit_logs(actor_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.safe_user_role(value text)
returns public.user_role
language plpgsql
immutable
as $$
begin
  if value in ('super_admin', 'admin', 'executive', 'hr', 'personnel') then
    return value::public.user_role;
  end if;

  return 'personnel'::public.user_role;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), ''),
    public.safe_user_role(new.raw_user_meta_data ->> 'role'),
    'active'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function public.is_privileged_role(allowed_roles public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = any(allowed_roles), false);
$$;

alter table public.profiles enable row level security;
alter table public.login_history enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles read own profile" on public.profiles;
create policy "profiles read own profile"
on public.profiles
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "profiles privileged read all" on public.profiles;
create policy "profiles privileged read all"
on public.profiles
for select
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin', 'executive', 'hr']::public.user_role[]));

drop policy if exists "profiles admin update all" on public.profiles;
create policy "profiles admin update all"
on public.profiles
for update
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "login history insert own" on public.login_history;
create policy "login history insert own"
on public.login_history
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "login history privileged read" on public.login_history;
create policy "login history privileged read"
on public.login_history
for select
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "audit logs insert own activity" on public.audit_logs;
create policy "audit logs insert own activity"
on public.audit_logs
for insert
to authenticated
with check (actor_id = auth.uid());

drop policy if exists "audit logs super admin read" on public.audit_logs;
create policy "audit logs super admin read"
on public.audit_logs
for select
to authenticated
using (public.is_privileged_role(array['super_admin']::public.user_role[]));

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;
grant insert, select on public.login_history to authenticated;
grant insert, select on public.audit_logs to authenticated;
