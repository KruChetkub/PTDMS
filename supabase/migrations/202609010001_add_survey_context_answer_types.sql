-- Allow additional survey context fields to collect choices, 1-5 ratings, or text.

begin;

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
  field_type text;
  field_answers jsonb;
  answer_count integer;
  answer_text text;
  rating_value numeric;
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
    field_type := coalesce(field ->> 'selection_type', 'single');
    field_answers := custom_answers -> field_id;

    if field_type in ('single', 'multiple') then
      field_answers := coalesce(field_answers, '[]'::jsonb);
      if jsonb_typeof(field_answers) <> 'array' then
        raise exception 'Custom choice answer must be an array.' using errcode = '22023';
      end if;
      answer_count := jsonb_array_length(field_answers);
      if coalesce((field ->> 'is_required')::boolean, true) and answer_count = 0 then
        raise exception 'A required custom context field is missing.' using errcode = '23514';
      end if;
      if field_type = 'single' and answer_count > 1 then
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
    elsif field_type = 'rating_5' then
      if field_answers is null or jsonb_typeof(field_answers) = 'null' then
        if coalesce((field ->> 'is_required')::boolean, true) then
          raise exception 'A required custom rating field is missing.' using errcode = '23514';
        end if;
        continue;
      end if;
      if jsonb_typeof(field_answers) <> 'number' then
        raise exception 'Custom rating answer must be a number.' using errcode = '22023';
      end if;
      rating_value := (field_answers #>> '{}')::numeric;
      if rating_value <> trunc(rating_value) or rating_value < 1 or rating_value > 5 then
        raise exception 'Custom rating answer must be an integer from 1 to 5.' using errcode = '23514';
      end if;
    elsif field_type = 'open_text' then
      if field_answers is null or jsonb_typeof(field_answers) = 'null' then
        if coalesce((field ->> 'is_required')::boolean, true) then
          raise exception 'A required custom text field is missing.' using errcode = '23514';
        end if;
        continue;
      end if;
      if jsonb_typeof(field_answers) <> 'string' then
        raise exception 'Custom text answer must be text.' using errcode = '22023';
      end if;
      answer_text := btrim(field_answers #>> '{}');
      if coalesce((field ->> 'is_required')::boolean, true) and answer_text = '' then
        raise exception 'A required custom text field is missing.' using errcode = '23514';
      end if;
      if char_length(answer_text) > 4000 then
        raise exception 'Custom text answer must not exceed 4000 characters.' using errcode = '23514';
      end if;
      custom_answers := jsonb_set(custom_answers, array[field_id], to_jsonb(answer_text), true);
    else
      raise exception 'Unsupported custom context field type.' using errcode = '23514';
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

revoke all on function public.normalize_smartdsp_survey_context(uuid, jsonb) from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;
