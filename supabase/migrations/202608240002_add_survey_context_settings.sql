-- Editable respondent-context prompts and labels for each survey round.

begin;

create table if not exists public.smartdsp_survey_context_settings (
  survey_id uuid primary key references public.smartdsp_surveys(id) on delete cascade,
  role_prompt text not null check (char_length(btrim(role_prompt)) between 1 and 300),
  frequency_prompt text not null check (char_length(btrim(frequency_prompt)) between 1 and 300),
  services_prompt text not null check (char_length(btrim(services_prompt)) between 1 and 500),
  role_options jsonb not null check (jsonb_typeof(role_options) = 'array' and jsonb_array_length(role_options) > 0),
  frequency_options jsonb not null check (jsonb_typeof(frequency_options) = 'array' and jsonb_array_length(frequency_options) > 0),
  service_options jsonb not null check (jsonb_typeof(service_options) = 'array' and jsonb_array_length(service_options) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.smartdsp_survey_context_settings (
  survey_id,
  role_prompt,
  frequency_prompt,
  services_prompt,
  role_options,
  frequency_options,
  service_options
)
select
  survey.id,
  'บทบาทของผู้ตอบแบบสำรวจ',
  'ความถี่ในการเข้าใช้งานระบบ',
  'ส่วนงานหรือบริการของ SmartDSP ที่เคยใช้งาน (เลือกได้มากกว่า 1 ข้อ)',
  '[{"value":"executive","label":"ผู้บริหาร"},{"value":"general_user","label":"ผู้ปฏิบัติงาน/ผู้ใช้งานทั่วไป"},{"value":"data_editor","label":"ผู้บันทึกหรือปรับปรุงข้อมูล"},{"value":"reviewer","label":"ผู้ตรวจสอบหรือผู้อนุมัติ"},{"value":"system_admin","label":"ผู้ดูแลระบบ"},{"value":"other","label":"อื่น ๆ"}]'::jsonb,
  '[{"value":"daily","label":"ทุกวัน"},{"value":"several_weekly","label":"สัปดาห์ละหลายครั้ง"},{"value":"weekly","label":"สัปดาห์ละ 1 ครั้ง"},{"value":"several_monthly","label":"เดือนละหลายครั้ง"},{"value":"rarely","label":"นาน ๆ ครั้ง"}]'::jsonb,
  '[{"value":"public_home_search","label":"หน้าหลักและการสืบค้นข้อมูลสาธารณะ"},{"value":"strategy_plans","label":"ยุทธศาสตร์และแผนปฏิบัติราชการ"},{"value":"performance_results","label":"ผลการดำเนินงานสำคัญของกรมควบคุมโรค"},{"value":"r2r_research","label":"งานวิจัยจากงานประจำ"},{"value":"personnel_profile","label":"ข้อมูลบุคลากรและข้อมูลส่วนบุคคลของผู้ใช้งาน"},{"value":"training_records","label":"ข้อมูลหลักสูตรและประวัติการฝึกอบรม"},{"value":"service_requests","label":"ระบบงานบริการหรือการติดตามคำขอ"},{"value":"meeting_resources","label":"ระบบจองห้องประชุมหรือทรัพยากร"},{"value":"reports_dashboard","label":"รายงาน สถิติ หรือ Dashboard"},{"value":"site_admin","label":"งานผู้ดูแลระบบและการจัดการเนื้อหา"},{"value":"other","label":"อื่น ๆ"}]'::jsonb
from public.smartdsp_surveys survey
on conflict (survey_id) do nothing;

create or replace function public.initialize_smartdsp_survey_context_settings()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.smartdsp_survey_context_settings (
    survey_id,
    role_prompt,
    frequency_prompt,
    services_prompt,
    role_options,
    frequency_options,
    service_options
  )
  select
    new.id,
    settings.role_prompt,
    settings.frequency_prompt,
    settings.services_prompt,
    settings.role_options,
    settings.frequency_options,
    settings.service_options
  from public.smartdsp_surveys previous_survey
  join public.smartdsp_survey_context_settings settings
    on settings.survey_id = previous_survey.id
  where previous_survey.code = new.code
    and previous_survey.id <> new.id
  order by previous_survey.version desc
  limit 1;

  if not found then
    insert into public.smartdsp_survey_context_settings (
      survey_id,
      role_prompt,
      frequency_prompt,
      services_prompt,
      role_options,
      frequency_options,
      service_options
    ) values (
      new.id,
      'บทบาทของผู้ตอบแบบสำรวจ',
      'ความถี่ในการเข้าใช้งานระบบ',
      'ส่วนงานหรือบริการของ SmartDSP ที่เคยใช้งาน (เลือกได้มากกว่า 1 ข้อ)',
      '[{"value":"executive","label":"ผู้บริหาร"},{"value":"general_user","label":"ผู้ปฏิบัติงาน/ผู้ใช้งานทั่วไป"},{"value":"data_editor","label":"ผู้บันทึกหรือปรับปรุงข้อมูล"},{"value":"reviewer","label":"ผู้ตรวจสอบหรือผู้อนุมัติ"},{"value":"system_admin","label":"ผู้ดูแลระบบ"},{"value":"other","label":"อื่น ๆ"}]'::jsonb,
      '[{"value":"daily","label":"ทุกวัน"},{"value":"several_weekly","label":"สัปดาห์ละหลายครั้ง"},{"value":"weekly","label":"สัปดาห์ละ 1 ครั้ง"},{"value":"several_monthly","label":"เดือนละหลายครั้ง"},{"value":"rarely","label":"นาน ๆ ครั้ง"}]'::jsonb,
      '[{"value":"public_home_search","label":"หน้าหลักและการสืบค้นข้อมูลสาธารณะ"},{"value":"strategy_plans","label":"ยุทธศาสตร์และแผนปฏิบัติราชการ"},{"value":"performance_results","label":"ผลการดำเนินงานสำคัญของกรมควบคุมโรค"},{"value":"r2r_research","label":"งานวิจัยจากงานประจำ"},{"value":"personnel_profile","label":"ข้อมูลบุคลากรและข้อมูลส่วนบุคคลของผู้ใช้งาน"},{"value":"training_records","label":"ข้อมูลหลักสูตรและประวัติการฝึกอบรม"},{"value":"service_requests","label":"ระบบงานบริการหรือการติดตามคำขอ"},{"value":"meeting_resources","label":"ระบบจองห้องประชุมหรือทรัพยากร"},{"value":"reports_dashboard","label":"รายงาน สถิติ หรือ Dashboard"},{"value":"site_admin","label":"งานผู้ดูแลระบบและการจัดการเนื้อหา"},{"value":"other","label":"อื่น ๆ"}]'::jsonb
    );
  end if;

  return new;
end;
$$;

drop trigger if exists initialize_smartdsp_survey_context_settings on public.smartdsp_surveys;
create trigger initialize_smartdsp_survey_context_settings
after insert on public.smartdsp_surveys
for each row
execute function public.initialize_smartdsp_survey_context_settings();

drop trigger if exists protect_answered_survey_context_settings on public.smartdsp_survey_context_settings;
create trigger protect_answered_survey_context_settings
before insert or update or delete on public.smartdsp_survey_context_settings
for each row
execute function public.prevent_answered_survey_structure_changes();

drop trigger if exists set_smartdsp_survey_context_settings_updated_at on public.smartdsp_survey_context_settings;
create trigger set_smartdsp_survey_context_settings_updated_at
before update on public.smartdsp_survey_context_settings
for each row
execute function public.set_updated_at();

alter table public.smartdsp_survey_context_settings enable row level security;

drop policy if exists "smartdsp survey context settings authenticated read" on public.smartdsp_survey_context_settings;
create policy "smartdsp survey context settings authenticated read"
on public.smartdsp_survey_context_settings
for select
to authenticated
using (public.current_user_role() is not null);

drop policy if exists "smartdsp survey context settings admin manage" on public.smartdsp_survey_context_settings;
create policy "smartdsp survey context settings admin manage"
on public.smartdsp_survey_context_settings
for all
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

revoke all on public.smartdsp_survey_context_settings from public, anon, authenticated;
grant select, insert, update, delete on public.smartdsp_survey_context_settings to authenticated;

commit;
