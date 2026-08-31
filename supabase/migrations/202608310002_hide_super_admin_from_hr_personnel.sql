-- Apply the super administrator visibility boundary to HR users as well as administrators.

begin;

drop policy if exists "profiles privileged read all" on public.profiles;
create policy "profiles privileged read all"
on public.profiles
for select
to authenticated
using (
  public.is_privileged_role(array['super_admin', 'admin', 'executive', 'hr']::public.user_role[])
  and not (
    public.current_user_role() = any(array['admin', 'hr']::public.user_role[])
    and role = 'super_admin'::public.user_role
  )
);

create or replace function public.admin_can_access_personnel(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    not (public.current_user_role() = any(array['admin', 'hr']::public.user_role[]))
    or not exists (
      select 1
      from public.profiles target
      where target.user_id = target_user_id
        and target.role = 'super_admin'::public.user_role
    ),
    false
  );
$$;

revoke all on function public.admin_can_access_personnel(uuid) from public, anon;
grant execute on function public.admin_can_access_personnel(uuid) to authenticated;

create or replace function public.protect_super_admin_training_records()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_user_id uuid := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
begin
  if public.current_user_role() = any(array['admin', 'hr']::public.user_role[])
    and exists (
      select 1
      from public.profiles target
      where target.user_id = target_user_id
        and target.role = 'super_admin'::public.user_role
    )
  then
    raise exception 'UNAUTHORIZED_TARGET_USER' using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_super_admin_training_records on public.training_records;
create trigger protect_super_admin_training_records
before insert or update or delete on public.training_records
for each row execute function public.protect_super_admin_training_records();

notify pgrst, 'reload schema';

commit;
