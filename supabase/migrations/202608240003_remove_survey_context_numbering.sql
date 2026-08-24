-- Remove presentation-only numbering from survey respondent context prompts.

begin;

drop trigger if exists protect_answered_survey_context_settings
on public.smartdsp_survey_context_settings;

update public.smartdsp_survey_context_settings
set
  role_prompt = regexp_replace(role_prompt, '^\s*3\.1\s*', ''),
  frequency_prompt = regexp_replace(frequency_prompt, '^\s*3\.2\s*', ''),
  services_prompt = regexp_replace(services_prompt, '^\s*3\.3\s*', '')
where role_prompt ~ '^\s*3\.1'
   or frequency_prompt ~ '^\s*3\.2'
   or services_prompt ~ '^\s*3\.3';

create trigger protect_answered_survey_context_settings
before insert or update or delete on public.smartdsp_survey_context_settings
for each row
execute function public.prevent_answered_survey_structure_changes();

commit;
