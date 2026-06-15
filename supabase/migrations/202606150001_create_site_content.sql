-- PTDMS public website content management.
-- This module is intentionally separate from Dashboard, Portal, and training domains.

do $$
begin
  create type public.site_content_status as enum ('published', 'draft', 'scheduled');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.site_content_documents (
  id uuid primary key default gen_random_uuid(),
  content_key text not null,
  title text not null default '',
  content jsonb not null default '{}'::jsonb,
  status public.site_content_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references public.profiles(user_id) on delete set null,
  updated_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_content_documents_key_not_blank check (length(trim(content_key)) > 0),
  constraint site_content_documents_key_unique unique (content_key),
  constraint site_content_documents_content_object check (jsonb_typeof(content) = 'object')
);

create table if not exists public.site_content_history (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.site_content_documents(id) on delete cascade,
  content_key text not null,
  content jsonb not null default '{}'::jsonb,
  status public.site_content_status not null,
  action text not null,
  actor_id uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  constraint site_content_history_action_not_blank check (length(trim(action)) > 0)
);

create index if not exists idx_site_content_documents_status on public.site_content_documents(status);
create index if not exists idx_site_content_documents_updated_at on public.site_content_documents(updated_at);
create index if not exists idx_site_content_history_document_id on public.site_content_history(document_id);
create index if not exists idx_site_content_history_created_at on public.site_content_history(created_at);

drop trigger if exists set_site_content_documents_updated_at on public.site_content_documents;
create trigger set_site_content_documents_updated_at
before update on public.site_content_documents
for each row
execute function public.set_updated_at();

create or replace function public.capture_site_content_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.site_content_history (
    document_id,
    content_key,
    content,
    status,
    action,
    actor_id
  )
  values (
    new.id,
    new.content_key,
    new.content,
    new.status,
    case when tg_op = 'INSERT' then 'created' else 'updated' end,
    auth.uid()
  );

  return new;
end;
$$;

drop trigger if exists capture_site_content_documents_history on public.site_content_documents;
create trigger capture_site_content_documents_history
after insert or update on public.site_content_documents
for each row
execute function public.capture_site_content_history();

alter table public.site_content_documents enable row level security;
alter table public.site_content_history enable row level security;

drop policy if exists "site content public read published" on public.site_content_documents;
create policy "site content public read published"
on public.site_content_documents
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "site content admin manage documents" on public.site_content_documents;
create policy "site content admin manage documents"
on public.site_content_documents
for all
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "site content admin read history" on public.site_content_history;
create policy "site content admin read history"
on public.site_content_history
for select
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "site content history insert via trigger" on public.site_content_history;
create policy "site content history insert via trigger"
on public.site_content_history
for insert
to authenticated
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

grant select on public.site_content_documents to anon;
grant select, insert, update, delete on public.site_content_documents to authenticated;
grant select, insert on public.site_content_history to authenticated;

insert into public.site_content_documents (
  content_key,
  title,
  content,
  status,
  published_at
)
values (
  'public-home',
  'PTDMS Public Home',
  '{
    "heroBanner": {
      "eyebrow": "PTDMS Public Center",
      "title": "ศูนย์รวมข้อมูล แผนงาน และข่าวประชาสัมพันธ์",
      "description": "ติดตามประกาศสำคัญ เอกสารเผยแพร่ และช่องทางเข้าสู่ระบบงานด้านแผนและพัฒนาบุคลากรของกองยุทธศาสตร์และแผนงาน",
      "imageUrl": "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?auto=format&fit=crop&w=1800&q=80",
      "primaryActionLabel": "เข้าสู่ระบบ PTDMS",
      "primaryActionHref": "/login",
      "secondaryActionLabel": "ดูแผนระดับต่าง ๆ",
      "secondaryActionHref": "#plan-levels",
      "publishWindow": "15 มิ.ย. 2569 - 30 มิ.ย. 2569",
      "status": "published"
    },
    "newsItems": [
      {
        "title": "ประกาศแนวทางการจัดทำแผนและรายงานผลประจำปี",
        "category": "ประกาศ",
        "dateLabel": "15 มิ.ย. 2569",
        "description": "รวบรวมขั้นตอนและเอกสารประกอบสำหรับหน่วยงานภายใน",
        "status": "published"
      },
      {
        "title": "เปิดใช้งานระบบ PTDMS สำหรับบุคลากร",
        "category": "ระบบงาน",
        "dateLabel": "12 มิ.ย. 2569",
        "description": "เข้าสู่ระบบเพื่อจัดการข้อมูลฝึกอบรมและข้อมูลพัฒนาบุคลากร",
        "status": "published"
      }
    ]
  }'::jsonb,
  'published',
  now()
)
on conflict (content_key) do nothing;
