-- Restrict all public repository management to Admin and Super Admin.
-- Published records remain readable by the public repository pages.

drop policy if exists "public user plans read published or own" on public.public_user_plans;
drop policy if exists "public user plans read published or admin" on public.public_user_plans;
create policy "public user plans read published or admin"
on public.public_user_plans
for select
to anon, authenticated
using (
  status = 'published'
  or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "public user plans insert own" on public.public_user_plans;
drop policy if exists "public user plans admin insert" on public.public_user_plans;
create policy "public user plans admin insert"
on public.public_user_plans
for insert
to authenticated
with check (
  owner_user_id = auth.uid()
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "public user plans update own" on public.public_user_plans;
drop policy if exists "public user plans admin update" on public.public_user_plans;
create policy "public user plans admin update"
on public.public_user_plans
for update
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "public user plans delete own" on public.public_user_plans;
drop policy if exists "public user plans admin delete" on public.public_user_plans;
create policy "public user plans admin delete"
on public.public_user_plans
for delete
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "performance results read published or own" on public.public_performance_results;
drop policy if exists "performance results read published or admin" on public.public_performance_results;
create policy "performance results read published or admin"
on public.public_performance_results
for select
to anon, authenticated
using (
  status = 'published'
  or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "performance results insert own" on public.public_performance_results;
drop policy if exists "performance results admin insert" on public.public_performance_results;
create policy "performance results admin insert"
on public.public_performance_results
for insert
to authenticated
with check (
  owner_user_id = auth.uid()
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "performance results update own" on public.public_performance_results;
drop policy if exists "performance results admin update" on public.public_performance_results;
create policy "performance results admin update"
on public.public_performance_results
for update
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "research items read published or own" on public.public_research_items;
drop policy if exists "research items read published or admin" on public.public_research_items;
create policy "research items read published or admin"
on public.public_research_items
for select
to anon, authenticated
using (
  status = 'published'
  or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "research items insert own" on public.public_research_items;
drop policy if exists "research items admin insert" on public.public_research_items;
create policy "research items admin insert"
on public.public_research_items
for insert
to authenticated
with check (
  owner_user_id = auth.uid()
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "research items update own" on public.public_research_items;
drop policy if exists "research items admin update" on public.public_research_items;
create policy "research items admin update"
on public.public_research_items
for update
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));
