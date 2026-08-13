-- Record PDPA acknowledgement when a user starts a survey, then bind it to the
-- response in the same transaction that submits the answers.

begin;

create table if not exists public.smartdsp_survey_consents (
  id uuid primary key default gen_random_uuid(),
  response_id uuid unique references public.smartdsp_survey_responses(id) on delete cascade,
  survey_id uuid not null references public.smartdsp_surveys(id) on delete restrict,
  respondent_id uuid not null references public.profiles(user_id) on delete restrict,
  notice_version text not null check (char_length(btrim(notice_version)) between 1 and 120),
  description_snapshot text not null,
  instructions_snapshot text not null,
  acknowledgement_statement text not null,
  consent_statement text not null,
  acknowledged boolean not null check (acknowledged = true),
  consented boolean not null check (consented = true),
  accepted_at timestamptz not null default now(),
  notice_sha256 text not null check (notice_sha256 ~ '^[0-9a-f]{64}$'),
  constraint smartdsp_survey_consents_notice_unique
    unique (survey_id, respondent_id, notice_sha256)
);

create index if not exists idx_smartdsp_survey_consents_respondent
on public.smartdsp_survey_consents (respondent_id, accepted_at desc);

create index if not exists idx_smartdsp_survey_consents_survey
on public.smartdsp_survey_consents (survey_id, accepted_at desc);

alter table public.smartdsp_survey_consents enable row level security;

drop policy if exists "smartdsp survey consent respondent or admin read" on public.smartdsp_survey_consents;
create policy "smartdsp survey consent respondent or admin read"
on public.smartdsp_survey_consents
for select
to authenticated
using (
  respondent_id = auth.uid()
  or public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

revoke all on public.smartdsp_survey_consents from public, anon, authenticated;
grant select on public.smartdsp_survey_consents to authenticated;

create or replace function public.accept_smartdsp_survey_pdpa(
  target_survey_id uuid,
  consent_confirmation jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  target_survey public.smartdsp_surveys%rowtype;
  consent_id uuid;
  notice_version_value text;
  notice_sha256_value text;
  acknowledgement_statement_value constant text := 'ข้าพเจ้าได้อ่านและรับทราบคำชี้แจงการคุ้มครองข้อมูลส่วนบุคคลฉบับนี้แล้ว';
  consent_statement_value constant text := 'ข้าพเจ้ายินยอมให้กองยุทธศาสตร์และแผนงาน กรมควบคุมโรค เก็บรวบรวม ใช้ หรือเปิดเผยข้อมูลส่วนบุคคลเพื่อวัตถุประสงค์ที่ระบุไว้ข้างต้น';
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
    raise exception 'Only active users can accept a survey notice.' using errcode = '42501';
  end if;

  if consent_confirmation is null
    or jsonb_typeof(consent_confirmation) <> 'object'
    or consent_confirmation -> 'acknowledged' is distinct from 'true'::jsonb
    or consent_confirmation -> 'consented' is distinct from 'true'::jsonb
  then
    raise exception 'Both PDPA acknowledgement and consent are required.' using errcode = '42501';
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

  notice_version_value := target_survey.code || '-v' || target_survey.version::text;
  notice_sha256_value := encode(sha256(convert_to(concat_ws(
    E'\n---\n',
    notice_version_value,
    target_survey.description,
    target_survey.instructions,
    acknowledgement_statement_value,
    consent_statement_value
  ), 'UTF8')), 'hex');

  insert into public.smartdsp_survey_consents (
    survey_id,
    respondent_id,
    notice_version,
    description_snapshot,
    instructions_snapshot,
    acknowledgement_statement,
    consent_statement,
    acknowledged,
    consented,
    notice_sha256
  ) values (
    target_survey.id,
    actor_id,
    notice_version_value,
    target_survey.description,
    target_survey.instructions,
    acknowledgement_statement_value,
    consent_statement_value,
    true,
    true,
    notice_sha256_value
  )
  on conflict (survey_id, respondent_id, notice_sha256) do nothing
  returning id into consent_id;

  if consent_id is null then
    select consent.id
    into consent_id
    from public.smartdsp_survey_consents consent
    where consent.survey_id = target_survey.id
      and consent.respondent_id = actor_id
      and consent.notice_sha256 = notice_sha256_value;
  end if;

  return consent_id;
end;
$$;

create or replace function public.submit_smartdsp_survey_with_context(
  target_survey_id uuid,
  submitted_answers jsonb,
  respondent_context jsonb,
  consent_record_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  new_response_id uuid;
  target_survey public.smartdsp_surveys%rowtype;
  target_consent public.smartdsp_survey_consents%rowtype;
  expected_notice_sha256 text;
  acknowledgement_statement_value constant text := 'ข้าพเจ้าได้อ่านและรับทราบคำชี้แจงการคุ้มครองข้อมูลส่วนบุคคลฉบับนี้แล้ว';
  consent_statement_value constant text := 'ข้าพเจ้ายินยอมให้กองยุทธศาสตร์และแผนงาน กรมควบคุมโรค เก็บรวบรวม ใช้ หรือเปิดเผยข้อมูลส่วนบุคคลเพื่อวัตถุประสงค์ที่ระบุไว้ข้างต้น';
begin
  if actor_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select *
  into target_survey
  from public.smartdsp_surveys survey
  where survey.id = target_survey_id
  for update;

  if not found then
    raise exception 'Survey not found.' using errcode = 'P0002';
  end if;

  expected_notice_sha256 := encode(sha256(convert_to(concat_ws(
    E'\n---\n',
    target_survey.code || '-v' || target_survey.version::text,
    target_survey.description,
    target_survey.instructions,
    acknowledgement_statement_value,
    consent_statement_value
  ), 'UTF8')), 'hex');

  select *
  into target_consent
  from public.smartdsp_survey_consents consent
  where consent.id = consent_record_id
  for update;

  if not found
    or target_consent.survey_id <> target_survey_id
    or target_consent.respondent_id <> actor_id
    or target_consent.response_id is not null
    or not target_consent.acknowledged
    or not target_consent.consented
  then
    raise exception 'A valid PDPA consent record is required.' using errcode = '42501';
  end if;

  if target_consent.notice_sha256 <> expected_notice_sha256 then
    raise exception 'The survey notice has changed. Please review and accept it again.' using errcode = '55000';
  end if;

  -- This existing RPC validates context and answers, then inserts both atomically.
  new_response_id := public.submit_smartdsp_survey_with_context(
    target_survey_id,
    submitted_answers,
    respondent_context
  );

  update public.smartdsp_survey_consents consent
  set response_id = new_response_id
  where consent.id = consent_record_id;

  return new_response_id;
end;
$$;

revoke all on function public.accept_smartdsp_survey_pdpa(uuid, jsonb)
from public, anon;
grant execute on function public.accept_smartdsp_survey_pdpa(uuid, jsonb)
to authenticated;

-- Disable the previous endpoint for clients; the four-argument function can
-- still invoke it internally as the database owner.
revoke all on function public.submit_smartdsp_survey_with_context(uuid, jsonb, jsonb)
from public, anon, authenticated;

revoke all on function public.submit_smartdsp_survey_with_context(uuid, jsonb, jsonb, uuid)
from public, anon;
grant execute on function public.submit_smartdsp_survey_with_context(uuid, jsonb, jsonb, uuid)
to authenticated;

commit;
