-- PTDMS training domain schema + RLS policies
-- Depends on 202605080001_auth_rbac_foundation.sql.

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.course_categories (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  subcategory text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint course_categories_unique unique (category, subcategory)
);

create table if not exists public.training_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  course text not null,
  category text not null,
  subcategory text,
  organizer text not null,
  date date not null,
  month int not null check (month between 1 and 12),
  year int not null check (year between 2400 and 2700),
  created_by uuid default auth.uid() references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.training_records(id) on delete cascade,
  certificate_name text,
  certificate_link text,
  file_path text,
  created_at timestamptz not null default now(),
  constraint certificates_link_https check (
    certificate_link is null
    or certificate_link = ''
    or certificate_link ~* '^https://'
  )
);

create table if not exists public.development_analysis (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.training_records(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  development_area text,
  skill_group text,
  target_direction text,
  created_at timestamptz not null default now()
);

create index if not exists idx_training_records_user_id on public.training_records(user_id);
create index if not exists idx_training_records_created_by on public.training_records(created_by);
create index if not exists idx_training_records_year_month on public.training_records(year, month);
create index if not exists idx_training_records_department_lookup on public.training_records(category, subcategory);
create index if not exists idx_training_records_course_search on public.training_records using gin (to_tsvector('simple', course));
create unique index if not exists idx_training_records_unique_dedupe
on public.training_records (user_id, lower(course), date, lower(organizer));

create index if not exists idx_certificates_training_id on public.certificates(training_id);
create index if not exists idx_development_analysis_training_id on public.development_analysis(training_id);
create index if not exists idx_development_analysis_user_id on public.development_analysis(user_id);
create index if not exists idx_course_categories_active on public.course_categories(active);
create index if not exists idx_departments_active on public.departments(active);

drop trigger if exists set_training_records_updated_at on public.training_records;
create trigger set_training_records_updated_at
before update on public.training_records
for each row
execute function public.set_updated_at();

alter table public.departments enable row level security;
alter table public.course_categories enable row level security;
alter table public.training_records enable row level security;
alter table public.certificates enable row level security;
alter table public.development_analysis enable row level security;

drop policy if exists "departments authenticated read" on public.departments;
create policy "departments authenticated read"
on public.departments
for select
to authenticated
using (true);

drop policy if exists "departments hr admin manage" on public.departments;
create policy "departments hr admin manage"
on public.departments
for all
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin', 'hr']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin', 'hr']::public.user_role[]));

drop policy if exists "course categories authenticated read" on public.course_categories;
create policy "course categories authenticated read"
on public.course_categories
for select
to authenticated
using (true);

drop policy if exists "course categories hr admin manage" on public.course_categories;
create policy "course categories hr admin manage"
on public.course_categories
for all
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin', 'hr']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin', 'hr']::public.user_role[]));

drop policy if exists "training records read own" on public.training_records;
create policy "training records read own"
on public.training_records
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "training records privileged read all" on public.training_records;
create policy "training records privileged read all"
on public.training_records
for select
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin', 'executive', 'hr']::public.user_role[]));

drop policy if exists "training records insert own or hr admin" on public.training_records;
create policy "training records insert own or hr admin"
on public.training_records
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    user_id = auth.uid()
    or public.is_privileged_role(array['super_admin', 'admin', 'hr']::public.user_role[])
  )
);

drop policy if exists "training records update own or hr admin" on public.training_records;
create policy "training records update own or hr admin"
on public.training_records
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_privileged_role(array['super_admin', 'admin', 'hr']::public.user_role[])
)
with check (
  user_id = auth.uid()
  or public.is_privileged_role(array['super_admin', 'admin', 'hr']::public.user_role[])
);

drop policy if exists "training records delete hr admin" on public.training_records;
create policy "training records delete hr admin"
on public.training_records
for delete
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin', 'hr']::public.user_role[]));

drop policy if exists "certificates read by training access" on public.certificates;
create policy "certificates read by training access"
on public.certificates
for select
to authenticated
using (
  exists (
    select 1
    from public.training_records tr
    where tr.id = certificates.training_id
      and (
        tr.user_id = auth.uid()
        or public.is_privileged_role(array['super_admin', 'admin', 'executive', 'hr']::public.user_role[])
      )
  )
);

drop policy if exists "certificates insert by training owner or hr admin" on public.certificates;
create policy "certificates insert by training owner or hr admin"
on public.certificates
for insert
to authenticated
with check (
  exists (
    select 1
    from public.training_records tr
    where tr.id = certificates.training_id
      and (
        tr.user_id = auth.uid()
        or public.is_privileged_role(array['super_admin', 'admin', 'hr']::public.user_role[])
      )
  )
);

drop policy if exists "certificates update by training owner or hr admin" on public.certificates;
create policy "certificates update by training owner or hr admin"
on public.certificates
for update
to authenticated
using (
  exists (
    select 1
    from public.training_records tr
    where tr.id = certificates.training_id
      and (
        tr.user_id = auth.uid()
        or public.is_privileged_role(array['super_admin', 'admin', 'hr']::public.user_role[])
      )
  )
)
with check (
  exists (
    select 1
    from public.training_records tr
    where tr.id = certificates.training_id
      and (
        tr.user_id = auth.uid()
        or public.is_privileged_role(array['super_admin', 'admin', 'hr']::public.user_role[])
      )
  )
);

drop policy if exists "certificates delete hr admin" on public.certificates;
create policy "certificates delete hr admin"
on public.certificates
for delete
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin', 'hr']::public.user_role[]));

drop policy if exists "development analysis read by owner or privileged" on public.development_analysis;
create policy "development analysis read by owner or privileged"
on public.development_analysis
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_privileged_role(array['super_admin', 'admin', 'executive', 'hr']::public.user_role[])
);

drop policy if exists "development analysis insert by owner or hr admin" on public.development_analysis;
create policy "development analysis insert by owner or hr admin"
on public.development_analysis
for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.is_privileged_role(array['super_admin', 'admin', 'hr']::public.user_role[])
);

drop policy if exists "development analysis update by owner or hr admin" on public.development_analysis;
create policy "development analysis update by owner or hr admin"
on public.development_analysis
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_privileged_role(array['super_admin', 'admin', 'hr']::public.user_role[])
)
with check (
  user_id = auth.uid()
  or public.is_privileged_role(array['super_admin', 'admin', 'hr']::public.user_role[])
);

drop policy if exists "development analysis delete hr admin" on public.development_analysis;
create policy "development analysis delete hr admin"
on public.development_analysis
for delete
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin', 'hr']::public.user_role[]));

grant select, insert, update, delete on public.departments to authenticated;
grant select, insert, update, delete on public.course_categories to authenticated;
grant select, insert, update, delete on public.training_records to authenticated;
grant select, insert, update, delete on public.certificates to authenticated;
grant select, insert, update, delete on public.development_analysis to authenticated;
