create or replace function public.generate_spd_service_ticket_no(category_label text, created_on date default current_date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  prefix text;
  date_part text;
  sequence_no integer;
begin
  prefix := case
    when lower(category_label) like '%it%' then 'DSP-IT'
    when lower(category_label) like '%software%' then 'DSP-SW'
    when lower(category_label) like '%information%' then 'DSP-IS'
    when lower(category_label) like '%digital%' then 'DSP-DG'
    else 'DSP-SV'
  end;

  date_part := to_char(created_on, 'DDMM') || (extract(year from created_on)::integer + 543)::text;

  select count(*) + 1
  into sequence_no
  from public.spd_service_tickets
  where ticket_no like prefix || '-' || date_part || '-%';

  return prefix || '-' || date_part || '-' || lpad(sequence_no::text, 3, '0');
end;
$$;