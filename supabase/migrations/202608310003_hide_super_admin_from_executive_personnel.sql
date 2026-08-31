-- Apply the super administrator visibility boundary to executive users.

begin;

drop policy if exists "profiles privileged read all" on public.profiles;
create policy "profiles privileged read all"
on public.profiles
for select
to authenticated
using (
  public.is_privileged_role(array['super_admin', 'admin', 'executive', 'hr']::public.user_role[])
  and not (
    public.current_user_role() = any(array['admin', 'executive', 'hr']::public.user_role[])
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
    not (public.current_user_role() = any(array['admin', 'executive', 'hr']::public.user_role[]))
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

notify pgrst, 'reload schema';

commit;
