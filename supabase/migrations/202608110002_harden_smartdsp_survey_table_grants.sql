-- Enforce least-privilege grants for the SmartDSP survey domain.
-- Responses and answers must be written only through submit_smartdsp_survey().

begin;

revoke all on public.smartdsp_surveys from public, anon, authenticated;
revoke all on public.smartdsp_survey_questions from public, anon, authenticated;
revoke all on public.smartdsp_survey_rating_options from public, anon, authenticated;
revoke all on public.smartdsp_survey_responses from public, anon, authenticated;
revoke all on public.smartdsp_survey_answers from public, anon, authenticated;

grant select, insert, update, delete on public.smartdsp_surveys to authenticated;
grant select, insert, update, delete on public.smartdsp_survey_questions to authenticated;
grant select, insert, update, delete on public.smartdsp_survey_rating_options to authenticated;
grant select on public.smartdsp_survey_responses to authenticated;
grant select on public.smartdsp_survey_answers to authenticated;

revoke all on function public.submit_smartdsp_survey(uuid, jsonb) from public, anon;
grant execute on function public.submit_smartdsp_survey(uuid, jsonb) to authenticated;

commit;
