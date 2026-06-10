-- SPD Assistant knowledge base, RAG search, audit trail, and storage bootstrap.

create extension if not exists "pg_trgm";

create table if not exists public.spd_assistant_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  title text not null,
  source_type text not null default 'documentation',
  file_path text,
  version text not null default '1.0.0',
  active boolean not null default true,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.spd_assistant_knowledge (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.spd_assistant_sources(id) on delete set null,
  title text not null,
  module text not null,
  route text,
  keywords text[] not null default '{}',
  question text not null,
  answer text not null,
  related_roles public.user_role[] not null default array['super_admin', 'admin', 'executive', 'hr', 'personnel']::public.user_role[],
  language text not null default 'th',
  content_type text not null default 'faq',
  priority integer not null default 100,
  active boolean not null default true,
  search_text text not null default '',
  created_by uuid references public.profiles(user_id) on delete set null,
  updated_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.spd_assistant_page_contexts (
  id uuid primary key default gen_random_uuid(),
  route text not null unique,
  page_name_th text not null,
  module_name_th text not null,
  description_th text not null,
  help_text_th text not null,
  available_actions_th text[] not null default '{}',
  common_questions_th text[] not null default '{}',
  related_roles public.user_role[] not null default array['super_admin', 'admin', 'executive', 'hr', 'personnel']::public.user_role[],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.spd_assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(user_id) on delete set null,
  route text,
  page_name_th text,
  module_name_th text,
  user_role public.user_role,
  created_at timestamptz not null default now()
);

create table if not exists public.spd_assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.spd_assistant_conversations(id) on delete cascade,
  user_id uuid references public.profiles(user_id) on delete set null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  route text,
  matched_knowledge_id uuid references public.spd_assistant_knowledge(id) on delete set null,
  score numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.spd_assistant_feedback (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.spd_assistant_messages(id) on delete cascade,
  user_id uuid references public.profiles(user_id) on delete set null,
  rating text not null check (rating in ('helpful', 'not_helpful')),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_spd_assistant_knowledge_route on public.spd_assistant_knowledge(route);
create index if not exists idx_spd_assistant_knowledge_module on public.spd_assistant_knowledge(module);
create index if not exists idx_spd_assistant_knowledge_active on public.spd_assistant_knowledge(active);
create index if not exists idx_spd_assistant_knowledge_search_text on public.spd_assistant_knowledge using gin (search_text gin_trgm_ops);
create index if not exists idx_spd_assistant_messages_conversation on public.spd_assistant_messages(conversation_id, created_at);
create index if not exists idx_spd_assistant_messages_user on public.spd_assistant_messages(user_id, created_at desc);

create or replace function public.set_spd_assistant_knowledge_search_text()
returns trigger
language plpgsql
as $$
begin
  new.search_text = lower(
    coalesce(new.title, '') || ' ' ||
    coalesce(new.module, '') || ' ' ||
    coalesce(new.route, '') || ' ' ||
    array_to_string(coalesce(new.keywords, '{}'), ' ') || ' ' ||
    coalesce(new.question, '') || ' ' ||
    coalesce(new.answer, '')
  );

  return new;
end;
$$;

drop trigger if exists set_spd_assistant_sources_updated_at on public.spd_assistant_sources;
create trigger set_spd_assistant_sources_updated_at
before update on public.spd_assistant_sources
for each row execute function public.set_updated_at();

drop trigger if exists set_spd_assistant_knowledge_search_text on public.spd_assistant_knowledge;
create trigger set_spd_assistant_knowledge_search_text
before insert or update on public.spd_assistant_knowledge
for each row execute function public.set_spd_assistant_knowledge_search_text();

drop trigger if exists set_spd_assistant_knowledge_updated_at on public.spd_assistant_knowledge;
create trigger set_spd_assistant_knowledge_updated_at
before update on public.spd_assistant_knowledge
for each row execute function public.set_updated_at();

drop trigger if exists set_spd_assistant_page_contexts_updated_at on public.spd_assistant_page_contexts;
create trigger set_spd_assistant_page_contexts_updated_at
before update on public.spd_assistant_page_contexts
for each row execute function public.set_updated_at();

create or replace function public.spd_assistant_match_role(allowed_roles public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = any(allowed_roles), false);
$$;

create or replace function public.search_spd_assistant_knowledge(
  p_query text,
  p_route text default null,
  p_module text default null,
  p_limit integer default 5
)
returns table (
  id uuid,
  title text,
  module text,
  route text,
  question text,
  answer text,
  keywords text[],
  related_roles public.user_role[],
  score numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized_query text := lower(trim(coalesce(p_query, '')));
begin
  if normalized_query = '' then
    return;
  end if;

  return query
  select
    k.id,
    k.title,
    k.module,
    k.route,
    k.question,
    k.answer,
    k.keywords,
    k.related_roles,
    (
      case when p_route is not null and k.route = p_route then 45 else 0 end +
      case when p_module is not null and lower(k.module) = lower(p_module) then 20 else 0 end +
      case when lower(k.question) like '%' || normalized_query || '%' then 35 else 0 end +
      case when lower(k.answer) like '%' || normalized_query || '%' then 25 else 0 end +
      case when k.search_text like '%' || normalized_query || '%' then 20 else 0 end +
      case when exists (
        select 1 from unnest(k.keywords) keyword
        where normalized_query like '%' || lower(keyword) || '%'
           or lower(keyword) like '%' || normalized_query || '%'
      ) then 30 else 0 end
    )::numeric as score
  from public.spd_assistant_knowledge k
  where k.active = true
    and k.language = 'th'
    and public.spd_assistant_match_role(k.related_roles)
    and (
      k.search_text like '%' || normalized_query || '%'
      or exists (
        select 1 from unnest(k.keywords) keyword
        where normalized_query like '%' || lower(keyword) || '%'
           or lower(keyword) like '%' || normalized_query || '%'
      )
    )
  order by score desc, k.priority asc, k.updated_at desc
  limit least(greatest(coalesce(p_limit, 5), 1), 10);
end;
$$;

create or replace function public.get_spd_assistant_page_context(p_route text)
returns table (
  route text,
  page_name_th text,
  module_name_th text,
  description_th text,
  help_text_th text,
  available_actions_th text[],
  common_questions_th text[],
  related_roles public.user_role[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.route,
    c.page_name_th,
    c.module_name_th,
    c.description_th,
    c.help_text_th,
    c.available_actions_th,
    c.common_questions_th,
    c.related_roles
  from public.spd_assistant_page_contexts c
  where c.active = true
    and (c.route = p_route or (c.route = '*' and not exists (
      select 1 from public.spd_assistant_page_contexts exact_context
      where exact_context.active = true and exact_context.route = p_route
    )))
    and public.spd_assistant_match_role(c.related_roles)
  order by case when c.route = p_route then 0 else 1 end
  limit 1;
$$;

alter table public.spd_assistant_sources enable row level security;
alter table public.spd_assistant_knowledge enable row level security;
alter table public.spd_assistant_page_contexts enable row level security;
alter table public.spd_assistant_conversations enable row level security;
alter table public.spd_assistant_messages enable row level security;
alter table public.spd_assistant_feedback enable row level security;

drop policy if exists "spd assistant sources read active" on public.spd_assistant_sources;
create policy "spd assistant sources read active"
on public.spd_assistant_sources for select to authenticated
using (active = true);

drop policy if exists "spd assistant sources admin manage" on public.spd_assistant_sources;
create policy "spd assistant sources admin manage"
on public.spd_assistant_sources for all to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "spd assistant knowledge role read" on public.spd_assistant_knowledge;
create policy "spd assistant knowledge role read"
on public.spd_assistant_knowledge for select to authenticated
using (active = true and public.spd_assistant_match_role(related_roles));

drop policy if exists "spd assistant knowledge admin manage" on public.spd_assistant_knowledge;
create policy "spd assistant knowledge admin manage"
on public.spd_assistant_knowledge for all to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "spd assistant contexts role read" on public.spd_assistant_page_contexts;
create policy "spd assistant contexts role read"
on public.spd_assistant_page_contexts for select to authenticated
using (active = true and public.spd_assistant_match_role(related_roles));

drop policy if exists "spd assistant contexts admin manage" on public.spd_assistant_page_contexts;
create policy "spd assistant contexts admin manage"
on public.spd_assistant_page_contexts for all to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "spd assistant conversations own read" on public.spd_assistant_conversations;
create policy "spd assistant conversations own read"
on public.spd_assistant_conversations for select to authenticated
using (user_id = auth.uid() or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "spd assistant conversations own insert" on public.spd_assistant_conversations;
create policy "spd assistant conversations own insert"
on public.spd_assistant_conversations for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "spd assistant messages own read" on public.spd_assistant_messages;
create policy "spd assistant messages own read"
on public.spd_assistant_messages for select to authenticated
using (user_id = auth.uid() or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "spd assistant messages own insert" on public.spd_assistant_messages;
create policy "spd assistant messages own insert"
on public.spd_assistant_messages for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "spd assistant feedback own insert" on public.spd_assistant_feedback;
create policy "spd assistant feedback own insert"
on public.spd_assistant_feedback for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "spd assistant feedback admin read" on public.spd_assistant_feedback;
create policy "spd assistant feedback admin read"
on public.spd_assistant_feedback for select to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

grant select, insert, update, delete on public.spd_assistant_sources to authenticated;
grant select, insert, update, delete on public.spd_assistant_knowledge to authenticated;
grant select, insert, update, delete on public.spd_assistant_page_contexts to authenticated;
grant select, insert on public.spd_assistant_conversations to authenticated;
grant select, insert on public.spd_assistant_messages to authenticated;
grant select, insert on public.spd_assistant_feedback to authenticated;
grant execute on function public.search_spd_assistant_knowledge(text, text, text, integer) to authenticated;
grant execute on function public.get_spd_assistant_page_context(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('spd-assistant-imports', 'spd-assistant-imports', false, 5242880, array['application/json', 'text/markdown', 'text/plain'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "spd assistant imports admin read" on storage.objects;
create policy "spd assistant imports admin read"
on storage.objects for select to authenticated
using (
  bucket_id = 'spd-assistant-imports'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "spd assistant imports admin write" on storage.objects;
create policy "spd assistant imports admin write"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'spd-assistant-imports'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

insert into public.spd_assistant_sources (source_key, title, source_type, file_path)
values
  ('system-inventory', 'PTDMS System Inventory', 'documentation', '/docs/SYSTEM_INVENTORY.md'),
  ('system-database', 'PTDMS Database Documentation', 'documentation', '/docs/SYSTEM_DATABASE.md'),
  ('user-guide', 'PTDMS User Guide', 'documentation', '/docs/USER_GUIDE.md'),
  ('admin-guide', 'PTDMS Administrative Guide', 'documentation', '/docs/ADMIN_GUIDE.md'),
  ('thai-knowledge', 'SPD Assistant Thai Knowledge Base', 'knowledge_base', '/docs/SPD_ASSISTANT_KNOWLEDGE_TH.md'),
  ('page-contexts-th', 'Thai Page Contexts', 'page_contexts', '/docs/PAGE_CONTEXTS_TH.json'),
  ('faq-th', 'Thai FAQ Knowledge', 'faq', '/docs/FAQ_KNOWLEDGE_TH.json')
on conflict (source_key) do update
set title = excluded.title,
    source_type = excluded.source_type,
    file_path = excluded.file_path,
    active = true,
    updated_at = now();

insert into public.spd_assistant_page_contexts (route, page_name_th, module_name_th, description_th, help_text_th, available_actions_th, common_questions_th, related_roles)
values
  ('/login', 'หน้าเข้าสู่ระบบ', 'การยืนยันตัวตน', 'หน้าสำหรับเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน', 'กรอกอีเมลและรหัสผ่าน หากลืมรหัสผ่านให้ไปหน้าลืมรหัสผ่าน', array['กรอกอีเมล', 'กรอกรหัสผ่าน', 'เข้าสู่ระบบ', 'ไปหน้าลืมรหัสผ่าน'], array['เข้าสู่ระบบอย่างไร', 'ลืมรหัสผ่านทำอย่างไร', 'ทำไม login ไม่ได้'], array['super_admin','admin','executive','hr','personnel']::public.user_role[]),
  ('/portal', 'หน้า Portal', 'การนำทาง', 'หน้าศูนย์กลางหลังเข้าสู่ระบบ', 'เลือกการ์ดระบบที่ต้องการใช้งาน เมนูขึ้นอยู่กับบทบาท', array['เข้าสู่ PTDMS', 'เปิด Strategy Calendar', 'เปิด IT Assets', 'ออกจากระบบ'], array['Portal ใช้ทำอะไร', 'ทำไมเมนูบางอย่างไม่แสดง'], array['super_admin','admin','executive','hr','personnel']::public.user_role[]),
  ('/records', 'รายการประวัติการอบรม', 'Training Records', 'หน้าค้นหา กรอง แก้ไข และลบประวัติการอบรมตามสิทธิ์', 'ใช้ตัวกรองเพื่อค้นหารายการ แล้วแก้ไขหรือลบตามสิทธิ์ RLS', array['ค้นหา', 'กรอง', 'แก้ไข', 'ลบตามสิทธิ์'], array['แก้ไขข้อมูลอบรมอย่างไร', 'ทำไมลบไม่ได้', 'ต้องใช้สิทธิ์อะไร'], array['super_admin','admin','executive','hr']::public.user_role[]),
  ('/admin/users', 'จัดการผู้ใช้', 'Administration', 'หน้าจัดการบัญชี บทบาท สถานะ และโปรไฟล์ผู้ใช้', 'super_admin/admin จัดการ role และ status ได้ ส่วน HR แก้รายละเอียดโปรไฟล์ได้', array['ค้นหาผู้ใช้', 'สร้างผู้ใช้', 'เปลี่ยน role', 'เปลี่ยน status', 'แก้โปรไฟล์', 'ลบตามสิทธิ์'], array['สร้าง user อย่างไร', 'HR เปลี่ยน role ได้ไหม', 'ใครลบ user ได้'], array['super_admin','admin','hr']::public.user_role[]),
  ('/admin/spd-assistant', 'จัดการ SPD Assistant', 'SPD Assistant', 'หน้าจัดการฐานความรู้ที่ Assistant ใช้ตอบคำถาม', 'เพิ่ม แก้ไข ปิดใช้งาน และตรวจสอบ knowledge records ที่อนุญาตให้ Assistant ใช้', array['ค้นหา knowledge', 'เพิ่ม record', 'แก้ไข record', 'เปิด/ปิด active'], array['เพิ่มคำตอบให้ Assistant อย่างไร', 'ทำไม Assistant ไม่ตอบ', 'ฐานความรู้อยู่ที่ไหน'], array['super_admin','admin']::public.user_role[]),
  ('/admin/spd-assistant/super', 'ควบคุม SPD Assistant ระดับ Super Admin', 'SPD Assistant', 'หน้าตรวจสอบสุขภาพระบบ ประวัติการใช้งาน และ feedback ของ Assistant', 'ใช้ตรวจสอบ audit trail, message log, feedback และข้อกำหนดความปลอดภัย', array['ดูสถิติ', 'ดู conversation logs', 'ดู feedback', 'ตรวจ security notes'], array['ตรวจประวัติคำถามได้ที่ไหน', 'ใครดู feedback ได้', 'ระบบตอบจากฐานความรู้เท่านั้นหรือไม่'], array['super_admin']::public.user_role[])
on conflict (route) do update
set page_name_th = excluded.page_name_th,
    module_name_th = excluded.module_name_th,
    description_th = excluded.description_th,
    help_text_th = excluded.help_text_th,
    available_actions_th = excluded.available_actions_th,
    common_questions_th = excluded.common_questions_th,
    related_roles = excluded.related_roles,
    active = true,
    updated_at = now();

insert into public.spd_assistant_knowledge (title, module, route, keywords, question, answer, related_roles, content_type, priority)
values
  ('หน้าเข้าสู่ระบบ', 'การยืนยันตัวตน', '/login', array['เข้าสู่ระบบ','login','อีเมล','รหัสผ่าน'], 'เข้าสู่ระบบอย่างไร', 'เปิดหน้าเข้าสู่ระบบ กรอกอีเมลที่ลงทะเบียนไว้และรหัสผ่าน จากนั้นกดเข้าสู่ระบบ หากบัญชียังไม่ active ระบบอาจพาไปหน้า Pending Approval', array['super_admin','admin','executive','hr','personnel']::public.user_role[], 'faq', 10),
  ('ลืมรหัสผ่าน', 'การยืนยันตัวตน', '/forgot-password', array['ลืมรหัสผ่าน','reset','อีเมล'], 'ลืมรหัสผ่านต้องทำอย่างไร', 'เปิดหน้าลืมรหัสผ่าน กรอกอีเมลที่ใช้กับบัญชี แล้วส่งคำขอ ระบบจะส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมล ให้ตรวจสอบทั้งกล่องจดหมายหลักและสแปม', array['super_admin','admin','executive','hr','personnel']::public.user_role[], 'faq', 20),
  ('Portal', 'การนำทาง', '/portal', array['portal','หน้าแรก','เมนู','ระบบ'], 'Portal ใช้ทำอะไร', 'Portal เป็นหน้าเริ่มต้นหลังเข้าสู่ระบบ ใช้เป็นทางเข้าสู่ระบบฝึกอบรม โปรไฟล์ รายการทรัพย์สิน IT ปฏิทินกลยุทธ์ และการตั้งค่า เมนูที่เห็นขึ้นอยู่กับบทบาทของผู้ใช้', array['super_admin','admin','executive','hr','personnel']::public.user_role[], 'page', 30),
  ('Training Records', 'Training Records', '/records', array['training records','ประวัติอบรม','แก้ไขอบรม','ลบอบรม'], 'แก้ไขประวัติการอบรมอย่างไร', 'เปิด Training Records ค้นหารายการ กด edit เปิดแบบฟอร์มแก้ไข แล้วบันทึก การแก้ไขและลบถูกจำกัดโดย RLS ให้ super_admin, admin และ hr หรือเจ้าของข้อมูลตามสิทธิ์', array['super_admin','admin','executive','hr']::public.user_role[], 'workflow', 40),
  ('Self-Service', 'Training', '/self-service', array['self-service','เพิ่มอบรม','บันทึกอบรม'], 'เพิ่มประวัติอบรมของตัวเองอย่างไร', 'เปิด Self-Service กรอกประเภท ชื่อหลักสูตร ผู้จัด วันที่ ปีงบประมาณ certificate และข้อมูล development จากนั้นกด submit', array['super_admin','admin','hr','personnel']::public.user_role[], 'workflow', 50),
  ('User Management', 'Administration', '/admin/users', array['user management','ผู้ใช้','role','status','อนุมัติ'], 'ใครจัดการผู้ใช้ได้', 'หน้า User Management เปิดให้ super_admin, admin และ hr โดย super_admin/admin สร้างผู้ใช้ เปลี่ยนบทบาท และเปลี่ยนสถานะได้ ส่วน hr แก้ข้อมูลโปรไฟล์ได้ แต่ไม่สามารถสร้างผู้ใช้หรือเปลี่ยน role/status ผ่าน UI', array['super_admin','admin','hr']::public.user_role[], 'permission', 60),
  ('สิทธิ์ Super Admin', 'Permissions', null, array['super_admin','สิทธิ์สูงสุด','security','delete user'], 'super_admin ทำอะไรได้บ้าง', 'super_admin เป็นบทบาทสิทธิ์สูงสุด สามารถจัดการผู้ใช้ ลบผู้ใช้ที่ไม่ใช่บัญชีตนเอง ดู Security จัดการ IT Assets จัดการข้อมูลอบรม และดูรายงานได้', array['super_admin']::public.user_role[], 'permission', 70),
  ('Route Guard และ RLS', 'Permissions', null, array['RLS','route guard','permission','บันทึกไม่ได้'], 'ทำไมเปิดหน้าได้แต่บันทึกไม่ได้', 'ระบบใช้สิทธิ์สองชั้นคือ route guard สำหรับเปิดหน้า และ Supabase RLS สำหรับอ่านเขียนฐานข้อมูล ดังนั้นผู้ใช้อาจเปิดหน้าได้แต่บันทึกไม่ได้หาก RLS ไม่อนุญาต', array['super_admin','admin','executive','hr','personnel']::public.user_role[], 'troubleshooting', 80),
  ('IT Asset Management', 'IT Assets', '/it-assets/manage', array['asset','IT','asset code','ทรัพย์สิน'], 'เพิ่มหรือแก้ไข IT Asset อย่างไร', 'เข้าสู่ระบบด้วย super_admin หรือ admin เปิด Manage IT Assets เพิ่มหรือเลือกแถว asset กรอก asset code ที่ไม่ซ้ำและรายละเอียดอื่น แล้วกด save', array['super_admin','admin']::public.user_role[], 'workflow', 90),
  ('Security Page', 'Security', '/admin/security', array['security','login history','ประวัติ login'], 'ใครดูประวัติการเข้าสู่ระบบได้', 'หน้า Security ในแอปเปิดให้เฉพาะ super_admin ใช้ดู login history และข้อมูลสรุปด้านความปลอดภัย', array['super_admin']::public.user_role[], 'permission', 100),
  ('ไม่พบข้อมูล', 'SPD Assistant', null, array['fallback','ไม่พบข้อมูล','knowledge base'], 'ถ้า Assistant ไม่พบข้อมูลต้องตอบอย่างไร', 'ขออภัย ไม่พบข้อมูลในฐานความรู้ของระบบ', array['super_admin','admin','executive','hr','personnel']::public.user_role[], 'policy', 1)
on conflict do nothing;
