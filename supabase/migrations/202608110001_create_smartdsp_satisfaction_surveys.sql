-- SmartDSP satisfaction surveys.
-- This domain is intentionally isolated from existing operational tables.

begin;

create table if not exists public.smartdsp_surveys (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  version integer not null default 1 check (version > 0),
  title text not null check (char_length(btrim(title)) between 1 and 300),
  description text not null default '',
  instructions text not null default '',
  status text not null default 'draft' check (status in ('draft', 'active', 'closed', 'archived')),
  is_enabled boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references public.profiles(user_id) on delete set null,
  updated_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint smartdsp_surveys_valid_period check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint smartdsp_surveys_code_format check (code ~ '^[a-z0-9][a-z0-9_-]{2,79}$'),
  constraint smartdsp_surveys_code_version_unique unique (code, version)
);

create table if not exists public.smartdsp_survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.smartdsp_surveys(id) on delete cascade,
  position integer not null check (position > 0),
  question_type text not null check (question_type in ('rating_5', 'open_text')),
  prompt text not null check (char_length(btrim(prompt)) between 1 and 1000),
  dimension text,
  help_text text,
  is_required boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint smartdsp_survey_questions_position_unique unique (survey_id, position),
  constraint smartdsp_survey_questions_dimension_length check (dimension is null or char_length(dimension) <= 200),
  constraint smartdsp_survey_questions_help_length check (help_text is null or char_length(help_text) <= 1000)
);

create table if not exists public.smartdsp_survey_rating_options (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.smartdsp_surveys(id) on delete cascade,
  rating_value smallint not null check (rating_value between 1 and 5),
  label text not null check (char_length(btrim(label)) between 1 and 100),
  description text not null check (char_length(btrim(description)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint smartdsp_survey_rating_options_value_unique unique (survey_id, rating_value)
);

create table if not exists public.smartdsp_survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.smartdsp_surveys(id) on delete restrict,
  respondent_id uuid not null references public.profiles(user_id) on delete restrict,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint smartdsp_survey_responses_one_per_user unique (survey_id, respondent_id)
);

create table if not exists public.smartdsp_survey_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.smartdsp_survey_responses(id) on delete cascade,
  question_id uuid not null references public.smartdsp_survey_questions(id) on delete restrict,
  question_position integer not null check (question_position > 0),
  question_type text not null check (question_type in ('rating_5', 'open_text')),
  question_prompt text not null,
  dimension text,
  rating_value smallint check (rating_value between 1 and 5),
  text_value text,
  created_at timestamptz not null default now(),
  constraint smartdsp_survey_answers_one_per_question unique (response_id, question_id),
  constraint smartdsp_survey_answers_value_matches_type check (
    (question_type = 'rating_5' and rating_value is not null and text_value is null)
    or
    (question_type = 'open_text' and rating_value is null and text_value is not null and char_length(btrim(text_value)) between 1 and 4000)
  )
);

create index if not exists idx_smartdsp_surveys_availability
on public.smartdsp_surveys (status, is_enabled, starts_at, ends_at);

create unique index if not exists idx_smartdsp_surveys_one_enabled_active
on public.smartdsp_surveys ((is_enabled))
where status = 'active' and is_enabled = true;

create index if not exists idx_smartdsp_survey_questions_order
on public.smartdsp_survey_questions (survey_id, is_active, position);

create index if not exists idx_smartdsp_survey_rating_options_order
on public.smartdsp_survey_rating_options (survey_id, rating_value);

create index if not exists idx_smartdsp_survey_responses_user
on public.smartdsp_survey_responses (respondent_id, submitted_at desc);

create index if not exists idx_smartdsp_survey_responses_survey
on public.smartdsp_survey_responses (survey_id, submitted_at desc);

create index if not exists idx_smartdsp_survey_answers_response
on public.smartdsp_survey_answers (response_id, question_position);

create or replace function public.smartdsp_survey_is_open(target_survey public.smartdsp_surveys)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    target_survey.status = 'active'
    and target_survey.is_enabled = true
    and (target_survey.starts_at is null or target_survey.starts_at <= now())
    and (target_survey.ends_at is null or target_survey.ends_at > now());
$$;

create or replace function public.prevent_answered_survey_structure_changes()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_survey_id uuid;
begin
  target_survey_id := case when tg_op = 'DELETE' then old.survey_id else new.survey_id end;

  if exists (
    select 1
    from public.smartdsp_survey_responses response
    where response.survey_id = target_survey_id
  ) then
    raise exception 'Survey questions cannot be changed after the first response. Create a new survey version.'
      using errcode = '55000';
  end if;

  if tg_op = 'UPDATE'
    and old.survey_id is distinct from new.survey_id
    and exists (
      select 1
      from public.smartdsp_survey_responses response
      where response.survey_id = old.survey_id
    ) then
    raise exception 'Survey questions cannot be moved after the first response. Create a new survey version.'
      using errcode = '55000';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.set_smartdsp_survey_actor()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_by := auth.uid();

  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists protect_answered_survey_questions on public.smartdsp_survey_questions;
create trigger protect_answered_survey_questions
before insert or update or delete on public.smartdsp_survey_questions
for each row
execute function public.prevent_answered_survey_structure_changes();

drop trigger if exists set_smartdsp_survey_actor on public.smartdsp_surveys;
create trigger set_smartdsp_survey_actor
before insert or update on public.smartdsp_surveys
for each row
execute function public.set_smartdsp_survey_actor();

drop trigger if exists protect_answered_survey_rating_options on public.smartdsp_survey_rating_options;
create trigger protect_answered_survey_rating_options
before insert or update or delete on public.smartdsp_survey_rating_options
for each row
execute function public.prevent_answered_survey_structure_changes();

drop trigger if exists set_smartdsp_surveys_updated_at on public.smartdsp_surveys;
create trigger set_smartdsp_surveys_updated_at
before update on public.smartdsp_surveys
for each row
execute function public.set_updated_at();

drop trigger if exists set_smartdsp_survey_rating_options_updated_at on public.smartdsp_survey_rating_options;
create trigger set_smartdsp_survey_rating_options_updated_at
before update on public.smartdsp_survey_rating_options
for each row
execute function public.set_updated_at();

drop trigger if exists set_smartdsp_survey_questions_updated_at on public.smartdsp_survey_questions;
create trigger set_smartdsp_survey_questions_updated_at
before update on public.smartdsp_survey_questions
for each row
execute function public.set_updated_at();

alter table public.smartdsp_surveys enable row level security;
alter table public.smartdsp_survey_questions enable row level security;
alter table public.smartdsp_survey_rating_options enable row level security;
alter table public.smartdsp_survey_responses enable row level security;
alter table public.smartdsp_survey_answers enable row level security;

drop policy if exists "smartdsp surveys active users read available" on public.smartdsp_surveys;
create policy "smartdsp surveys active users read available"
on public.smartdsp_surveys
for select
to authenticated
using (
  public.current_user_role() is not null
  and (
    public.smartdsp_survey_is_open(smartdsp_surveys)
    or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
    or exists (
      select 1
      from public.smartdsp_survey_responses response
      where response.survey_id = smartdsp_surveys.id
        and response.respondent_id = auth.uid()
    )
  )
);

drop policy if exists "smartdsp surveys admin manage" on public.smartdsp_surveys;
create policy "smartdsp surveys admin manage"
on public.smartdsp_surveys
for all
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "smartdsp survey rating options active users read" on public.smartdsp_survey_rating_options;
create policy "smartdsp survey rating options active users read"
on public.smartdsp_survey_rating_options
for select
to authenticated
using (
  public.current_user_role() is not null
  and (
    exists (
      select 1
      from public.smartdsp_surveys survey
      where survey.id = smartdsp_survey_rating_options.survey_id
        and public.smartdsp_survey_is_open(survey)
    )
    or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
    or exists (
      select 1
      from public.smartdsp_survey_responses response
      where response.survey_id = smartdsp_survey_rating_options.survey_id
        and response.respondent_id = auth.uid()
    )
  )
);

drop policy if exists "smartdsp survey rating options admin manage" on public.smartdsp_survey_rating_options;
create policy "smartdsp survey rating options admin manage"
on public.smartdsp_survey_rating_options
for all
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "smartdsp survey questions active users read" on public.smartdsp_survey_questions;
create policy "smartdsp survey questions active users read"
on public.smartdsp_survey_questions
for select
to authenticated
using (
  public.current_user_role() is not null
  and (
    exists (
      select 1
      from public.smartdsp_surveys survey
      where survey.id = smartdsp_survey_questions.survey_id
        and public.smartdsp_survey_is_open(survey)
    )
    or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
    or exists (
      select 1
      from public.smartdsp_survey_responses response
      where response.survey_id = smartdsp_survey_questions.survey_id
        and response.respondent_id = auth.uid()
    )
  )
);

drop policy if exists "smartdsp survey questions admin manage" on public.smartdsp_survey_questions;
create policy "smartdsp survey questions admin manage"
on public.smartdsp_survey_questions
for all
to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "smartdsp survey responses read own or admin" on public.smartdsp_survey_responses;
create policy "smartdsp survey responses read own or admin"
on public.smartdsp_survey_responses
for select
to authenticated
using (
  respondent_id = auth.uid()
  or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "smartdsp survey answers read own or admin" on public.smartdsp_survey_answers;
create policy "smartdsp survey answers read own or admin"
on public.smartdsp_survey_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.smartdsp_survey_responses response
    where response.id = smartdsp_survey_answers.response_id
      and (
        response.respondent_id = auth.uid()
        or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
      )
  )
);

create or replace function public.submit_smartdsp_survey(
  target_survey_id uuid,
  submitted_answers jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  target_survey public.smartdsp_surveys%rowtype;
  response_id uuid;
  answer_count integer;
  active_question_count integer;
  required_question_count integer;
  required_answer_count integer;
begin
  if actor_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles profile
    where profile.user_id = actor_id
      and profile.status = 'active'
  ) then
    raise exception 'Only active users can submit a survey.' using errcode = '42501';
  end if;

  select *
  into target_survey
  from public.smartdsp_surveys survey
  where survey.id = target_survey_id
  for update;

  if not found then
    raise exception 'Survey not found.' using errcode = 'P0002';
  end if;

  if not public.smartdsp_survey_is_open(target_survey) then
    raise exception 'Survey is not open.' using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.smartdsp_survey_responses response
    where response.survey_id = target_survey_id
      and response.respondent_id = actor_id
  ) then
    raise exception 'This user has already submitted this survey.' using errcode = '23505';
  end if;

  if submitted_answers is null or jsonb_typeof(submitted_answers) <> 'array' then
    raise exception 'Answers must be a JSON array.' using errcode = '22023';
  end if;

  select count(*)
  into answer_count
  from jsonb_array_elements(submitted_answers);

  if answer_count = 0 then
    raise exception 'At least one answer is required.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(submitted_answers) answer
    where not (answer ? 'question_id')
      or (answer ->> 'question_id') is null
      or (answer ->> 'question_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) then
    raise exception 'Every answer must contain a valid question_id.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(submitted_answers) answer
    group by answer ->> 'question_id'
    having count(*) > 1
  ) then
    raise exception 'A question can be answered only once.' using errcode = '22023';
  end if;

  select count(*)
  into active_question_count
  from public.smartdsp_survey_questions question
  where question.survey_id = target_survey_id
    and question.is_active = true;

  if answer_count > active_question_count then
    raise exception 'The submission contains too many answers.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(submitted_answers) answer
    left join public.smartdsp_survey_questions question
      on question.id = (answer ->> 'question_id')::uuid
      and question.survey_id = target_survey_id
      and question.is_active = true
    where question.id is null
  ) then
    raise exception 'The submission contains an unknown or inactive question.' using errcode = '22023';
  end if;

  select count(*)
  into required_question_count
  from public.smartdsp_survey_questions question
  where question.survey_id = target_survey_id
    and question.is_active = true
    and question.is_required = true;

  select count(*)
  into required_answer_count
  from jsonb_array_elements(submitted_answers) answer
  join public.smartdsp_survey_questions question
    on question.id = (answer ->> 'question_id')::uuid
  where question.survey_id = target_survey_id
    and question.is_active = true
    and question.is_required = true;

  if required_answer_count <> required_question_count then
    raise exception 'Every required question must be answered.' using errcode = '23514';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(submitted_answers) answer
    join public.smartdsp_survey_questions question
      on question.id = (answer ->> 'question_id')::uuid
    where question.question_type = 'rating_5'
      and (
        coalesce(jsonb_typeof(answer -> 'rating_value'), '') <> 'number'
        or coalesce(answer ->> 'rating_value', '') !~ '^[1-5]$'
      )
  ) then
    raise exception 'Rating answers must be integers from 1 to 5.' using errcode = '23514';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(submitted_answers) answer
    join public.smartdsp_survey_questions question
      on question.id = (answer ->> 'question_id')::uuid
    where question.question_type = 'open_text'
      and (
        nullif(btrim(answer ->> 'text_value'), '') is null
        or char_length(answer ->> 'text_value') > 4000
      )
  ) then
    raise exception 'Text answers must contain 1 to 4000 characters.' using errcode = '23514';
  end if;

  insert into public.smartdsp_survey_responses (survey_id, respondent_id)
  values (target_survey_id, actor_id)
  returning id into response_id;

  insert into public.smartdsp_survey_answers (
    response_id,
    question_id,
    question_position,
    question_type,
    question_prompt,
    dimension,
    rating_value,
    text_value
  )
  select
    response_id,
    question.id,
    question.position,
    question.question_type,
    question.prompt,
    question.dimension,
    case when question.question_type = 'rating_5' then (answer ->> 'rating_value')::smallint end,
    case when question.question_type = 'open_text' then btrim(answer ->> 'text_value') end
  from jsonb_array_elements(submitted_answers) answer
  join public.smartdsp_survey_questions question
    on question.id = (answer ->> 'question_id')::uuid
  where question.survey_id = target_survey_id
    and question.is_active = true;

  return response_id;
exception
  when unique_violation then
    raise exception 'This user has already submitted this survey.' using errcode = '23505';
end;
$$;

revoke all on public.smartdsp_surveys from anon;
revoke all on public.smartdsp_survey_questions from anon;
revoke all on public.smartdsp_survey_rating_options from anon;
revoke all on public.smartdsp_survey_responses from anon;
revoke all on public.smartdsp_survey_answers from anon;

grant select, insert, update, delete on public.smartdsp_surveys to authenticated;
grant select, insert, update, delete on public.smartdsp_survey_questions to authenticated;
grant select, insert, update, delete on public.smartdsp_survey_rating_options to authenticated;
grant select on public.smartdsp_survey_responses to authenticated;
grant select on public.smartdsp_survey_answers to authenticated;

revoke all on function public.submit_smartdsp_survey(uuid, jsonb) from public;
grant execute on function public.submit_smartdsp_survey(uuid, jsonb) to authenticated;

insert into public.smartdsp_surveys (
  code,
  version,
  title,
  description,
  instructions,
  status,
  is_enabled
)
values (
  'smartdsp-satisfaction',
  1,
  'แบบสำรวจความพึงพอใจต่อการใช้งานระบบ SmartDSP',
  'แบบสำรวจสำหรับประเมินคุณภาพ ประสิทธิภาพ ประโยชน์ และความพึงพอใจของผู้ใช้งานระบบ SmartDSP',
  'โปรดประเมินจากประสบการณ์ใช้งานจริง โดยระดับ 1 หมายถึงควรปรับปรุงอย่างยิ่ง และระดับ 5 หมายถึงดีมาก',
  'draft',
  false
)
on conflict (code, version) do nothing;

insert into public.smartdsp_survey_rating_options (
  survey_id,
  rating_value,
  label,
  description
)
select
  survey.id,
  rating.rating_value,
  rating.label,
  rating.description
from public.smartdsp_surveys survey
cross join (
  values
    (1, 'น้อยที่สุด/ควรปรับปรุงอย่างยิ่ง', 'ระบบไม่สามารถตอบสนองความต้องการ หรือเกิดปัญหารุนแรงเป็นประจำจนไม่สามารถดำเนินงานต่อได้ และจำเป็นต้องแก้ไขโดยเร่งด่วน'),
    (2, 'น้อย/ควรปรับปรุง', 'ระบบตอบสนองได้เพียงบางส่วน มีปัญหาหรือข้อจำกัดเกิดขึ้นบ่อย ทำให้เสียเวลา เกิดความสับสน หรือต้องขอความช่วยเหลือเป็นประจำ'),
    (3, 'ปานกลาง/พอใช้', 'ระบบรองรับการทำงานพื้นฐานได้ แต่ยังมีข้อขัดข้องหรือขั้นตอนที่ไม่สะดวกเป็นบางครั้ง และยังมีประเด็นที่ควรปรับปรุงอย่างชัดเจน'),
    (4, 'มาก/ดี', 'ระบบตอบสนองความต้องการได้ดี ใช้งานสะดวกและถูกต้อง ปัญหาเกิดขึ้นน้อยและไม่กระทบสาระสำคัญของงาน'),
    (5, 'มากที่สุด/ดีมาก', 'ระบบตอบสนองความต้องการได้ครบถ้วน รวดเร็ว ถูกต้อง และต่อเนื่อง ช่วยให้การทำงานมีประสิทธิภาพอย่างชัดเจน')
) as rating(rating_value, label, description)
where survey.code = 'smartdsp-satisfaction'
  and survey.version = 1
on conflict (survey_id, rating_value) do nothing;

insert into public.smartdsp_survey_questions (
  survey_id,
  position,
  question_type,
  prompt,
  dimension,
  help_text,
  is_required
)
select
  survey.id,
  question.position,
  question.question_type,
  question.prompt,
  question.dimension,
  question.help_text,
  question.is_required
from public.smartdsp_surveys survey
cross join (
  values
    (1, 'rating_5', 'ท่านสามารถเข้าสู่ระบบและเข้าถึงเมนูที่ได้รับสิทธิ์ได้สะดวก โดยไม่พบขั้นตอนที่ซับซ้อนหรืออุปสรรคเกินความจำเป็น', 'การเข้าถึงระบบ', null, true),
    (2, 'rating_5', 'เมนู ปุ่ม คำอธิบาย และลำดับขั้นตอนของระบบมีความชัดเจน ทำให้เรียนรู้และใช้งานได้ง่าย', 'ความง่ายในการใช้งาน', null, true),
    (3, 'rating_5', 'การจัดวางหน้าจอ ขนาดข้อความ สี และรูปแบบการแสดงผลมีความเหมาะสม สามารถอ่านและใช้งานได้อย่างสะดวก', 'การออกแบบส่วนติดต่อผู้ใช้', null, true),
    (4, 'rating_5', 'ระบบตอบสนองได้รวดเร็ว มีความเสถียร และไม่เกิดข้อผิดพลาดหรือหยุดทำงานระหว่างการใช้งานบ่อยครั้ง', 'ประสิทธิภาพและเสถียรภาพ', null, true),
    (5, 'rating_5', 'ข้อมูลและเอกสารที่แสดงในระบบมีความถูกต้อง ครบถ้วน เป็นปัจจุบัน และน่าเชื่อถือสำหรับนำไปใช้งาน', 'คุณภาพข้อมูล', null, true),
    (6, 'rating_5', 'ระบบช่วยให้ค้นหา เข้าถึง ดาวน์โหลด หรือเรียกใช้ข้อมูลและเอกสารที่ต้องการได้สะดวกและรวดเร็ว', 'การสืบค้นและเข้าถึงข้อมูล', null, true),
    (7, 'rating_5', 'ฟังก์ชันของระบบสอดคล้องกับบทบาท ภารกิจ และขั้นตอนการปฏิบัติงานของท่าน', 'ความเหมาะสมกับภารกิจ', null, true),
    (8, 'rating_5', 'ท่านมีความเชื่อมั่นว่าระบบกำหนดสิทธิ์การเข้าถึงอย่างเหมาะสม และช่วยป้องกันผู้ที่ไม่มีสิทธิ์เข้าถึงหรือแก้ไขข้อมูล', 'ความมั่นคงปลอดภัยและสิทธิ์', null, true),
    (9, 'rating_5', 'ระบบช่วยลดเวลา ลดขั้นตอน ลดความซ้ำซ้อน หรือเพิ่มความสะดวกในการปฏิบัติงานของท่านได้อย่างชัดเจน', 'ประสิทธิผลต่อการปฏิบัติงาน', null, true),
    (10, 'rating_5', 'โดยภาพรวม ท่านมีความพึงพอใจต่อระบบ SmartDSP และมีความประสงค์จะใช้งานระบบอย่างต่อเนื่อง', 'ความพึงพอใจโดยรวม', null, true),
    (11, 'open_text', 'โปรดระบุปัญหา อุปสรรค ขั้นตอน หรือส่วนของระบบ SmartDSP ที่ควรได้รับการปรับปรุง', 'ปัญหาและสิ่งที่ควรปรับปรุง', 'โปรดยกตัวอย่างเหตุการณ์หรือผลกระทบต่อการปฏิบัติงาน หากมี', false),
    (12, 'open_text', 'โปรดเสนอฟังก์ชัน บริการ ข้อมูล หรือแนวทางพัฒนาระบบ SmartDSP เพิ่มเติม', 'ข้อเสนอแนะเพิ่มเติม', null, false)
) as question(position, question_type, prompt, dimension, help_text, is_required)
where survey.code = 'smartdsp-satisfaction'
  and survey.version = 1
on conflict (survey_id, position) do nothing;

commit;
