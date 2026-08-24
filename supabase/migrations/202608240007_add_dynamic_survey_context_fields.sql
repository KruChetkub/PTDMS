-- Make respondent context headings and options extensible while retaining legacy columns.

begin;

alter table public.smartdsp_survey_context_settings
add column if not exists additional_fields jsonb not null default '[]'::jsonb;

alter table public.smartdsp_survey_respondent_contexts
add column if not exists custom_answers jsonb not null default '{}'::jsonb;

alter table public.smartdsp_survey_respondent_contexts
drop constraint if exists smartdsp_survey_respondent_contexts_respondent_role_check;

alter table public.smartdsp_survey_respondent_contexts
drop constraint if exists smartdsp_survey_respondent_contexts_usage_frequency_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'smartdsp_survey_context_settings_additional_fields_check'
      and conrelid = 'public.smartdsp_survey_context_settings'::regclass
  ) then
    alter table public.smartdsp_survey_context_settings
      add constraint smartdsp_survey_context_settings_additional_fields_check
      check (jsonb_typeof(additional_fields) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'smartdsp_survey_contexts_custom_answers_check'
      and conrelid = 'public.smartdsp_survey_respondent_contexts'::regclass
  ) then
    alter table public.smartdsp_survey_respondent_contexts
      add constraint smartdsp_survey_contexts_custom_answers_check
      check (jsonb_typeof(custom_answers) = 'object');
  end if;
end $$;

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
    service_options,
    additional_fields
  )
  select
    new.id,
    settings.role_prompt,
    settings.frequency_prompt,
    settings.services_prompt,
    settings.role_options,
    settings.frequency_options,
    settings.service_options,
    settings.additional_fields
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
      service_options,
      additional_fields
    ) values (
      new.id,
      'บทบาทของผู้ตอบแบบสำรวจ',
      'ความถี่ในการเข้าใช้งานระบบ',
      'ส่วนงานหรือบริการของ SmartDSP ที่เคยใช้งาน (เลือกได้มากกว่า 1 ข้อ)',
      '[{"value":"executive","label":"ผู้บริหาร"},{"value":"general_user","label":"ผู้ปฏิบัติงาน/ผู้ใช้งานทั่วไป"},{"value":"data_editor","label":"ผู้บันทึกหรือปรับปรุงข้อมูล"},{"value":"reviewer","label":"ผู้ตรวจสอบหรือผู้อนุมัติ"},{"value":"system_admin","label":"ผู้ดูแลระบบ"},{"value":"other","label":"อื่น ๆ"}]'::jsonb,
      '[{"value":"daily","label":"ทุกวัน"},{"value":"several_weekly","label":"สัปดาห์ละหลายครั้ง"},{"value":"weekly","label":"สัปดาห์ละ 1 ครั้ง"},{"value":"several_monthly","label":"เดือนละหลายครั้ง"},{"value":"rarely","label":"นาน ๆ ครั้ง"}]'::jsonb,
      '[{"value":"public_home_search","label":"หน้าหลักและการสืบค้นข้อมูลสาธารณะ"},{"value":"strategy_plans","label":"ยุทธศาสตร์และแผนปฏิบัติราชการ"},{"value":"performance_results","label":"ผลการดำเนินงานสำคัญของกรมควบคุมโรค"},{"value":"r2r_research","label":"งานวิจัยจากงานประจำ"},{"value":"personnel_profile","label":"ข้อมูลบุคลากรและข้อมูลส่วนบุคคลของผู้ใช้งาน"},{"value":"training_records","label":"ข้อมูลหลักสูตรและประวัติการฝึกอบรม"},{"value":"service_requests","label":"ระบบงานบริการหรือการติดตามคำขอ"},{"value":"meeting_resources","label":"ระบบจองห้องประชุมหรือทรัพยากร"},{"value":"reports_dashboard","label":"รายงาน สถิติ หรือ Dashboard"},{"value":"site_admin","label":"งานผู้ดูแลระบบและการจัดการเนื้อหา"},{"value":"other","label":"อื่น ๆ"}]'::jsonb,
      '[]'::jsonb
    );
  end if;

  return new;
end;
$$;

create or replace function public.normalize_smartdsp_survey_context(
  target_survey_id uuid,
  respondent_context jsonb
)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  settings public.smartdsp_survey_context_settings%rowtype;
  selected_role text;
  selected_role_other text;
  selected_frequency text;
  selected_services text[];
  selected_services_other text;
  custom_answers jsonb;
  field jsonb;
  field_id text;
  field_answers jsonb;
  answer_count integer;
begin
  if respondent_context is null or jsonb_typeof(respondent_context) <> 'object' then
    raise exception 'Respondent context is required.' using errcode = '22023';
  end if;

  select * into settings
  from public.smartdsp_survey_context_settings context_settings
  where context_settings.survey_id = target_survey_id;

  if not found then
    raise exception 'Survey context settings not found.' using errcode = 'P0002';
  end if;

  selected_role := respondent_context ->> 'respondent_role';
  selected_role_other := nullif(btrim(respondent_context ->> 'respondent_role_other'), '');
  selected_frequency := respondent_context ->> 'usage_frequency';
  selected_services_other := nullif(btrim(respondent_context ->> 'used_services_other'), '');
  custom_answers := coalesce(respondent_context -> 'custom_answers', '{}'::jsonb);

  if selected_role is null or not exists (
    select 1 from jsonb_array_elements(settings.role_options) option
    where option ->> 'value' = selected_role
  ) then
    raise exception 'Invalid respondent role.' using errcode = '23514';
  end if;
  if selected_role = 'other' and (selected_role_other is null or char_length(selected_role_other) > 500) then
    raise exception 'Other respondent role is required and must not exceed 500 characters.' using errcode = '23514';
  end if;
  if selected_role <> 'other' then selected_role_other := null; end if;

  if selected_frequency is null or not exists (
    select 1 from jsonb_array_elements(settings.frequency_options) option
    where option ->> 'value' = selected_frequency
  ) then
    raise exception 'Invalid usage frequency.' using errcode = '23514';
  end if;

  if jsonb_typeof(respondent_context -> 'used_services') <> 'array' then
    raise exception 'Used services must be an array.' using errcode = '22023';
  end if;

  select array_agg(distinct service order by service)
  into selected_services
  from jsonb_array_elements_text(respondent_context -> 'used_services') service;

  if coalesce(cardinality(selected_services), 0) = 0 or exists (
    select 1 from unnest(selected_services) service
    where not exists (
      select 1 from jsonb_array_elements(settings.service_options) option
      where option ->> 'value' = service
    )
  ) then
    raise exception 'Invalid used services.' using errcode = '23514';
  end if;

  if 'other' = any(selected_services) and (selected_services_other is null or char_length(selected_services_other) > 500) then
    raise exception 'Other used service is required and must not exceed 500 characters.' using errcode = '23514';
  end if;
  if not ('other' = any(selected_services)) then selected_services_other := null; end if;

  if jsonb_typeof(custom_answers) <> 'object' then
    raise exception 'Custom context answers must be an object.' using errcode = '22023';
  end if;

  for field in select value from jsonb_array_elements(settings.additional_fields)
  loop
    if coalesce((field ->> 'is_active')::boolean, true) = false then
      continue;
    end if;

    field_id := field ->> 'id';
    field_answers := coalesce(custom_answers -> field_id, '[]'::jsonb);
    if jsonb_typeof(field_answers) <> 'array' then
      raise exception 'Custom context answer must be an array.' using errcode = '22023';
    end if;

    answer_count := jsonb_array_length(field_answers);
    if coalesce((field ->> 'is_required')::boolean, true) and answer_count = 0 then
      raise exception 'A required custom context field is missing.' using errcode = '23514';
    end if;
    if field ->> 'selection_type' = 'single' and answer_count > 1 then
      raise exception 'A single-choice custom context field has multiple answers.' using errcode = '23514';
    end if;
    if exists (
      select 1 from jsonb_array_elements_text(field_answers) answer
      where not exists (
        select 1 from jsonb_array_elements(field -> 'options') option
        where option ->> 'value' = answer
      )
    ) then
      raise exception 'Invalid custom context option.' using errcode = '23514';
    end if;
  end loop;

  if exists (
    select 1 from jsonb_object_keys(custom_answers) answer_key
    where not exists (
      select 1 from jsonb_array_elements(settings.additional_fields) configured_field
      where configured_field ->> 'id' = answer_key
        and coalesce((configured_field ->> 'is_active')::boolean, true)
    )
  ) then
    raise exception 'Unknown custom context field.' using errcode = '23514';
  end if;

  return jsonb_build_object(
    'respondent_role', selected_role,
    'respondent_role_other', selected_role_other,
    'usage_frequency', selected_frequency,
    'used_services', to_jsonb(selected_services),
    'used_services_other', selected_services_other,
    'custom_answers', custom_answers
  );
end;
$$;

create or replace function public.submit_smartdsp_survey_with_context(
  target_survey_id uuid,
  submitted_answers jsonb,
  respondent_context jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  response_id uuid;
  normalized_context jsonb;
begin
  normalized_context := public.normalize_smartdsp_survey_context(target_survey_id, respondent_context);
  response_id := public.submit_smartdsp_survey(target_survey_id, submitted_answers);

  insert into public.smartdsp_survey_respondent_contexts (
    response_id,
    respondent_role,
    respondent_role_other,
    usage_frequency,
    used_services,
    used_services_other,
    custom_answers
  ) values (
    response_id,
    normalized_context ->> 'respondent_role',
    normalized_context ->> 'respondent_role_other',
    normalized_context ->> 'usage_frequency',
    array(select jsonb_array_elements_text(normalized_context -> 'used_services')),
    normalized_context ->> 'used_services_other',
    normalized_context -> 'custom_answers'
  );

  return response_id;
end;
$$;

create or replace function public.complete_smartdsp_survey_respondent_context(
  target_response_id uuid,
  respondent_context jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  target_survey_id uuid;
  normalized_context jsonb;
begin
  select response.survey_id into target_survey_id
  from public.smartdsp_survey_responses response
  where response.id = target_response_id
    and response.respondent_id = actor_id;

  if actor_id is null or target_survey_id is null then
    raise exception 'Only the response owner can complete respondent context.' using errcode = '42501';
  end if;
  if exists (select 1 from public.smartdsp_survey_respondent_contexts context where context.response_id = target_response_id) then
    raise exception 'Respondent context has already been completed.' using errcode = '23505';
  end if;

  normalized_context := public.normalize_smartdsp_survey_context(target_survey_id, respondent_context);

  insert into public.smartdsp_survey_respondent_contexts (
    response_id,
    respondent_role,
    respondent_role_other,
    usage_frequency,
    used_services,
    used_services_other,
    custom_answers
  ) values (
    target_response_id,
    normalized_context ->> 'respondent_role',
    normalized_context ->> 'respondent_role_other',
    normalized_context ->> 'usage_frequency',
    array(select jsonb_array_elements_text(normalized_context -> 'used_services')),
    normalized_context ->> 'used_services_other',
    normalized_context -> 'custom_answers'
  );
end;
$$;

revoke all on function public.normalize_smartdsp_survey_context(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.submit_smartdsp_survey_with_context(uuid, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.complete_smartdsp_survey_respondent_context(uuid, jsonb) from public, anon;
grant execute on function public.complete_smartdsp_survey_respondent_context(uuid, jsonb) to authenticated;

commit;
