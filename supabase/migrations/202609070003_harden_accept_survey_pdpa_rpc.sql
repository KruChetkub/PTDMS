-- Harden CSV #35: keep the public RPC contract while moving its privileged
-- implementation outside the Data API's exposed public schema.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

alter function public.accept_smartdsp_survey_pdpa(uuid, jsonb)
set schema private;

alter function private.accept_smartdsp_survey_pdpa(uuid, jsonb)
rename to accept_smartdsp_survey_pdpa_impl;

alter function private.accept_smartdsp_survey_pdpa_impl(uuid, jsonb)
security definer;

alter function private.accept_smartdsp_survey_pdpa_impl(uuid, jsonb)
set search_path = '';

revoke all on function private.accept_smartdsp_survey_pdpa_impl(uuid, jsonb)
from public, anon, authenticated;
grant execute on function private.accept_smartdsp_survey_pdpa_impl(uuid, jsonb)
to authenticated;

create function public.accept_smartdsp_survey_pdpa(
  target_survey_id uuid,
  consent_confirmation jsonb
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.accept_smartdsp_survey_pdpa_impl(
    target_survey_id,
    consent_confirmation
  );
$$;

revoke all on function public.accept_smartdsp_survey_pdpa(uuid, jsonb)
from public, anon, authenticated;
grant execute on function public.accept_smartdsp_survey_pdpa(uuid, jsonb)
to authenticated;

notify pgrst, 'reload schema';
