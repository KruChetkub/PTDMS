-- Manage the new public Home page without changing repository records.

create table if not exists public.public_home_content_items (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  title text not null,
  description text not null default '',
  action_label text not null default 'รายละเอียด',
  target_view text not null default 'plans',
  icon_key text not null default 'file-chart',
  color_key text not null default 'blue',
  sort_order integer not null default 10,
  status text not null default 'draft',
  created_by uuid references public.profiles(user_id) on delete set null,
  updated_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_home_content_section_valid check (section in ('plan', 'policy')),
  constraint public_home_content_title_valid check (length(trim(title)) between 1 and 160),
  constraint public_home_content_description_valid check (length(description) <= 1000),
  constraint public_home_content_action_label_valid check (length(trim(action_label)) between 1 and 80),
  constraint public_home_content_target_view_valid check (target_view in ('plans', 'performance', 'research')),
  constraint public_home_content_icon_key_valid check (icon_key in ('landmark', 'target', 'file-chart', 'briefcase', 'shield', 'clipboard', 'coins', 'microscope')),
  constraint public_home_content_color_key_valid check (color_key in ('blue', 'emerald', 'violet', 'orange', 'rose', 'teal')),
  constraint public_home_content_sort_order_valid check (sort_order > 0),
  constraint public_home_content_status_valid check (status in ('draft', 'published'))
);

create index if not exists idx_public_home_content_listing
on public.public_home_content_items (section, status, sort_order, created_at);

insert into public.public_home_content_items
  (id, section, title, description, action_label, target_view, icon_key, color_key, sort_order, status)
values
  ('11000000-0000-4000-8000-000000000001', 'plan', 'แผนระดับ 1', 'ยุทธศาสตร์ชาติและกรอบทิศทางระดับประเทศ', 'รายละเอียด', 'plans', 'landmark', 'blue', 10, 'published'),
  ('11000000-0000-4000-8000-000000000002', 'plan', 'แผนระดับ 2', 'แผนแม่บท แผนปฏิรูปประเทศ และแผนพัฒนาระดับชาติ', 'รายละเอียด', 'plans', 'target', 'emerald', 20, 'published'),
  ('11000000-0000-4000-8000-000000000003', 'plan', 'แผนระดับ 3', 'แผนปฏิบัติราชการและแผนเฉพาะด้าน', 'รายละเอียด', 'plans', 'file-chart', 'violet', 30, 'published'),
  ('11000000-0000-4000-8000-000000000004', 'plan', 'นโยบายผู้บริหาร', 'กรอบนโยบายและทิศทางการบริหารกรมควบคุมโรค', 'รายละเอียด', 'plans', 'briefcase', 'orange', 40, 'published'),
  ('12000000-0000-4000-8000-000000000001', 'policy', 'แผนงานด้านการป้องกันควบคุมโรคและภัยสุขภาพ', 'แผนงานและกรอบดำเนินงานที่เชื่อมโยงนโยบายสู่การปฏิบัติของกรมควบคุมโรค', 'เปิดคลังแผนงาน', 'plans', 'shield', 'rose', 10, 'published'),
  ('12000000-0000-4000-8000-000000000002', 'policy', 'นโยบายผู้บริหาร', 'รวบรวมนโยบายสำคัญ แนวทางบริหาร และสารจากผู้บริหารสำหรับใช้ขับเคลื่อนภารกิจ', 'อ่านนโยบาย', 'plans', 'briefcase', 'orange', 20, 'published'),
  ('12000000-0000-4000-8000-000000000003', 'policy', 'แนวทางการดำเนินงานป้องกันควบคุมโรค', 'ผลการดำเนินงานสำคัญ รายงานประจำปี และแนวทางสำหรับการติดตามผลการปฏิบัติงาน', 'ดูผลการดำเนินงาน', 'performance', 'clipboard', 'blue', 30, 'published'),
  ('12000000-0000-4000-8000-000000000004', 'policy', 'งบประมาณและแผนปฏิบัติราชการประจำปี', 'เอกสารงบประมาณ แผนปฏิบัติราชการ และข้อมูลประกอบการบริหารทรัพยากรประจำปี', 'ดูแผนและเอกสาร', 'plans', 'coins', 'teal', 40, 'published')
on conflict (id) do nothing;

drop trigger if exists set_public_home_content_updated_at on public.public_home_content_items;
create trigger set_public_home_content_updated_at
before update on public.public_home_content_items
for each row execute function public.set_updated_at();

alter table public.public_home_content_items enable row level security;

drop policy if exists "home content public read published" on public.public_home_content_items;
create policy "home content public read published"
on public.public_home_content_items
for select
to anon, authenticated
using (
  status = 'published'
  or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "home content admin insert" on public.public_home_content_items;
create policy "home content admin insert"
on public.public_home_content_items
for insert
to authenticated
with check (
  public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
  and created_by = auth.uid()
  and updated_by = auth.uid()
);

drop policy if exists "home content admin update" on public.public_home_content_items;
create policy "home content admin update"
on public.public_home_content_items
for update
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (
  public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
  and updated_by = auth.uid()
);

drop policy if exists "home content admin delete" on public.public_home_content_items;
create policy "home content admin delete"
on public.public_home_content_items
for delete
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

grant select on public.public_home_content_items to anon;
grant select, insert, update, delete on public.public_home_content_items to authenticated;

notify pgrst, 'reload schema';
