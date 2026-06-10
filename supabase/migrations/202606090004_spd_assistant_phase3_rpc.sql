-- SPD Assistant Phase 3: RAG search RPC and page context RPC acceptance.

create or replace function public.spd_assistant_normalize_route(p_route text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when coalesce(p_route, '') ~ '^/personnel/[^/]+$' then '/personnel/:id'
    else nullif(coalesce(p_route, ''), '')
  end;
$$;

create or replace function public.spd_assistant_match_role(allowed_roles public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = any(allowed_roles), false);
$$;

create or replace function public.search_spd_assistant_knowledge(
  p_query text,
  p_route text default null,
  p_module text default null,
  p_limit integer default 5
)
returns table (
  id uuid,
  title text,
  module text,
  route text,
  question text,
  answer text,
  keywords text[],
  related_roles public.user_role[],
  score numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized_query text := lower(trim(coalesce(p_query, '')));
  normalized_route text := public.spd_assistant_normalize_route(p_route);
  safe_limit integer := least(greatest(coalesce(p_limit, 5), 1), 10);
begin
  if auth.uid() is null or normalized_query = '' then
    return;
  end if;

  return query
  select
    k.id,
    k.title,
    k.module,
    k.route,
    k.question,
    k.answer,
    k.keywords,
    k.related_roles,
    (
      case when normalized_route is not null and k.route = normalized_route then 45 else 0 end +
      case when p_module is not null and lower(k.module) = lower(p_module) then 20 else 0 end +
      case when lower(k.question) like '%' || normalized_query || '%' then 35 else 0 end +
      case when lower(k.answer) like '%' || normalized_query || '%' then 25 else 0 end +
      case when k.search_text like '%' || normalized_query || '%' then 20 else 0 end +
      case when exists (
        select 1
        from unnest(k.keywords) as keyword
        where lower(keyword) <> ''
          and (
            normalized_query like '%' || lower(keyword) || '%'
            or lower(keyword) like '%' || normalized_query || '%'
          )
      ) then 30 else 0 end
    )::numeric as score
  from public.spd_assistant_knowledge k
  where k.active = true
    and k.language = 'th'
    and public.spd_assistant_match_role(k.related_roles)
    and (
      lower(k.question) like '%' || normalized_query || '%'
      or lower(k.answer) like '%' || normalized_query || '%'
      or k.search_text like '%' || normalized_query || '%'
      or exists (
        select 1
        from unnest(k.keywords) as keyword
        where lower(keyword) <> ''
          and (
            normalized_query like '%' || lower(keyword) || '%'
            or lower(keyword) like '%' || normalized_query || '%'
          )
      )
    )
  order by score desc, k.priority asc, k.updated_at desc
  limit safe_limit;
end;
$$;

create or replace function public.get_spd_assistant_page_context(p_route text)
returns table (
  route text,
  page_name_th text,
  module_name_th text,
  description_th text,
  help_text_th text,
  available_actions_th text[],
  common_questions_th text[],
  related_roles public.user_role[]
)
language sql
stable
security definer
set search_path = public
as $$
  with requested as (
    select public.spd_assistant_normalize_route(p_route) as route
  )
  select
    c.route,
    c.page_name_th,
    c.module_name_th,
    c.description_th,
    c.help_text_th,
    c.available_actions_th,
    c.common_questions_th,
    c.related_roles
  from public.spd_assistant_page_contexts c
  cross join requested r
  where auth.uid() is not null
    and c.active = true
    and public.spd_assistant_match_role(c.related_roles)
    and (
      c.route = r.route
      or (
        c.route = '*'
        and not exists (
          select 1
          from public.spd_assistant_page_contexts exact_context
          where exact_context.active = true
            and exact_context.route = r.route
            and public.spd_assistant_match_role(exact_context.related_roles)
        )
      )
    )
  order by case when c.route = r.route then 0 else 1 end
  limit 1;
$$;

revoke execute on function public.spd_assistant_normalize_route(text) from public;
revoke execute on function public.spd_assistant_match_role(public.user_role[]) from public;
revoke execute on function public.search_spd_assistant_knowledge(text, text, text, integer) from public;
revoke execute on function public.get_spd_assistant_page_context(text) from public;

grant execute on function public.spd_assistant_normalize_route(text) to authenticated;
grant execute on function public.spd_assistant_match_role(public.user_role[]) to authenticated;
grant execute on function public.search_spd_assistant_knowledge(text, text, text, integer) to authenticated;
grant execute on function public.get_spd_assistant_page_context(text) to authenticated;
