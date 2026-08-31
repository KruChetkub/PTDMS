-- A finance officer is a personnel user with a supplemental budget permission.

begin;

create or replace function public.clear_personnel_only_permissions_on_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> 'personnel'::public.user_role and old.role is distinct from new.role then
    delete from public.user_permission_overrides
    where user_id = new.user_id
      and permission_key = 'budget_utilization.items.manage';
  end if;

  return new;
end;
$$;

drop trigger if exists clear_personnel_only_permissions_on_role_change
on public.profiles;
create trigger clear_personnel_only_permissions_on_role_change
after update of role on public.profiles
for each row execute function public.clear_personnel_only_permissions_on_role_change();

notify pgrst, 'reload schema';

commit;
