-- Security Hardening Plan 1.3.
--
-- Separate anonymous published-content access from authenticated admin access.
-- This prevents anon policies from invoking the privileged role helper that was
-- moved into the private schema, while preserving draft access for admins.

begin;

drop policy if exists "home content public read published"
on public.public_home_content_items;

create policy "home content public read published"
on public.public_home_content_items
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "home content admin read all"
on public.public_home_content_items;

create policy "home content admin read all"
on public.public_home_content_items
for select
to authenticated
using (
  private.is_privileged_role_impl(
    array['super_admin', 'admin']::public.user_role[]
  )
);

drop policy if exists "performance results read published or admin"
on public.public_performance_results;

create policy "performance results public read published"
on public.public_performance_results
for select
to anon, authenticated
using (status = 'published'::public.site_content_status);

drop policy if exists "performance results admin read all"
on public.public_performance_results;

create policy "performance results admin read all"
on public.public_performance_results
for select
to authenticated
using (
  private.is_privileged_role_impl(
    array['super_admin', 'admin']::public.user_role[]
  )
);

drop policy if exists "repository categories public read active"
on public.public_repository_categories;

create policy "repository categories public read active"
on public.public_repository_categories
for select
to anon, authenticated
using (is_active);

drop policy if exists "repository categories admin read all"
on public.public_repository_categories;

create policy "repository categories admin read all"
on public.public_repository_categories
for select
to authenticated
using (
  private.is_privileged_role_impl(
    array['super_admin', 'admin']::public.user_role[]
  )
);

drop policy if exists "research items read published or admin"
on public.public_research_items;

create policy "research items public read published"
on public.public_research_items
for select
to anon, authenticated
using (status = 'published'::public.site_content_status);

drop policy if exists "research items admin read all"
on public.public_research_items;

create policy "research items admin read all"
on public.public_research_items
for select
to authenticated
using (
  private.is_privileged_role_impl(
    array['super_admin', 'admin']::public.user_role[]
  )
);

drop policy if exists "public user plans read published or admin"
on public.public_user_plans;

create policy "public user plans public read published"
on public.public_user_plans
for select
to anon, authenticated
using (status = 'published'::public.site_content_status);

drop policy if exists "public user plans admin read all"
on public.public_user_plans;

create policy "public user plans admin read all"
on public.public_user_plans
for select
to authenticated
using (
  private.is_privileged_role_impl(
    array['super_admin', 'admin']::public.user_role[]
  )
);

drop policy if exists "public web page items read published or admin"
on public.public_web_page_items;

create policy "public web page items public read published"
on public.public_web_page_items
for select
to anon, authenticated
using (
  status = 'published'
  and exists (
    select 1
    from public.public_web_pages page
    where page.id = public.public_web_page_items.page_id
      and page.status = 'published'
  )
);

drop policy if exists "public web page items admin read all"
on public.public_web_page_items;

create policy "public web page items admin read all"
on public.public_web_page_items
for select
to authenticated
using (
  private.is_privileged_role_impl(
    array['super_admin', 'admin']::public.user_role[]
  )
);

drop policy if exists "public web pages read published or admin"
on public.public_web_pages;

create policy "public web pages public read published"
on public.public_web_pages
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "public web pages admin read all"
on public.public_web_pages;

create policy "public web pages admin read all"
on public.public_web_pages
for select
to authenticated
using (
  private.is_privileged_role_impl(
    array['super_admin', 'admin']::public.user_role[]
  )
);

notify pgrst, 'reload schema';

commit;

