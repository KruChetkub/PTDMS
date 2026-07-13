-- Lock down self-service signup role assignment.
-- New auth users always start as personnel. Elevated roles must be assigned by
-- existing admin workflows after the profile has been created.

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
    'personnel'::public.user_role,
    'active'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;
