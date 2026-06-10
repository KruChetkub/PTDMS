-- SPD Assistant Phase 2: RLS hardening, retrieval RPCs, and API boundary grants.

create or replace function public.spd_assistant_match_role(allowed_roles public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = any(allowed_roles), false);
$$;

alter table public.spd_assistant_sources enable row level security;
alter table public.spd_assistant_knowledge enable row level security;
alter table public.spd_assistant_page_contexts enable row level security;
alter table public.spd_assistant_conversations enable row level security;
alter table public.spd_assistant_messages enable row level security;
alter table public.spd_assistant_feedback enable row level security;

drop policy if exists "spd assistant sources read active" on public.spd_assistant_sources;
create policy "spd assistant sources read active"
on public.spd_assistant_sources for select to authenticated
using (active = true);

drop policy if exists "spd assistant sources admin manage" on public.spd_assistant_sources;
create policy "spd assistant sources admin manage"
on public.spd_assistant_sources for all to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "spd assistant knowledge role read" on public.spd_assistant_knowledge;
create policy "spd assistant knowledge role read"
on public.spd_assistant_knowledge for select to authenticated
using (active = true and public.spd_assistant_match_role(related_roles));

drop policy if exists "spd assistant knowledge admin manage" on public.spd_assistant_knowledge;
create policy "spd assistant knowledge admin manage"
on public.spd_assistant_knowledge for all to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "spd assistant contexts role read" on public.spd_assistant_page_contexts;
create policy "spd assistant contexts role read"
on public.spd_assistant_page_contexts for select to authenticated
using (active = true and public.spd_assistant_match_role(related_roles));

drop policy if exists "spd assistant contexts admin manage" on public.spd_assistant_page_contexts;
create policy "spd assistant contexts admin manage"
on public.spd_assistant_page_contexts for all to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]))
with check (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "spd assistant conversations own read" on public.spd_assistant_conversations;
create policy "spd assistant conversations own read"
on public.spd_assistant_conversations for select to authenticated
using (user_id = auth.uid());

drop policy if exists "spd assistant conversations admin governance read" on public.spd_assistant_conversations;
create policy "spd assistant conversations admin governance read"
on public.spd_assistant_conversations for select to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "spd assistant conversations own insert" on public.spd_assistant_conversations;
create policy "spd assistant conversations own insert"
on public.spd_assistant_conversations for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "spd assistant messages own read" on public.spd_assistant_messages;
create policy "spd assistant messages own read"
on public.spd_assistant_messages for select to authenticated
using (user_id = auth.uid());

drop policy if exists "spd assistant messages admin governance read" on public.spd_assistant_messages;
create policy "spd assistant messages admin governance read"
on public.spd_assistant_messages for select to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

drop policy if exists "spd assistant messages own insert" on public.spd_assistant_messages;
create policy "spd assistant messages own insert"
on public.spd_assistant_messages for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.spd_assistant_conversations c
    where c.id = conversation_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "spd assistant feedback own insert" on public.spd_assistant_feedback;
create policy "spd assistant feedback own insert"
on public.spd_assistant_feedback for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.spd_assistant_messages m
    where m.id = message_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "spd assistant feedback admin read" on public.spd_assistant_feedback;
create policy "spd assistant feedback admin read"
on public.spd_assistant_feedback for select to authenticated
using (public.is_privileged_role(array['super_admin', 'admin']::public.user_role[]));

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
      case when p_route is not null and k.route = p_route then 45 else 0 end +
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
  where auth.uid() is not null
    and c.active = true
    and public.spd_assistant_match_role(c.related_roles)
    and (
      c.route = p_route
      or (
        c.route = '*'
        and not exists (
          select 1
          from public.spd_assistant_page_contexts exact_context
          where exact_context.active = true
            and exact_context.route = p_route
            and public.spd_assistant_match_role(exact_context.related_roles)
        )
      )
    )
  order by case when c.route = p_route then 0 else 1 end
  limit 1;
$$;

grant select, insert, update, delete on public.spd_assistant_sources to authenticated;
grant select, insert, update, delete on public.spd_assistant_knowledge to authenticated;
grant select, insert, update, delete on public.spd_assistant_page_contexts to authenticated;
grant select, insert on public.spd_assistant_conversations to authenticated;
grant select, insert on public.spd_assistant_messages to authenticated;
grant select, insert on public.spd_assistant_feedback to authenticated;

revoke all on public.spd_assistant_sources from anon;
revoke all on public.spd_assistant_knowledge from anon;
revoke all on public.spd_assistant_page_contexts from anon;
revoke all on public.spd_assistant_conversations from anon;
revoke all on public.spd_assistant_messages from anon;
revoke all on public.spd_assistant_feedback from anon;

revoke execute on function public.spd_assistant_match_role(public.user_role[]) from public;
revoke execute on function public.search_spd_assistant_knowledge(text, text, text, integer) from public;
revoke execute on function public.get_spd_assistant_page_context(text) from public;
revoke execute on function public.spd_assistant_match_role(public.user_role[]) from anon;
revoke execute on function public.search_spd_assistant_knowledge(text, text, text, integer) from anon;
revoke execute on function public.get_spd_assistant_page_context(text) from anon;

grant execute on function public.spd_assistant_match_role(public.user_role[]) to authenticated;
grant execute on function public.search_spd_assistant_knowledge(text, text, text, integer) to authenticated;
grant execute on function public.get_spd_assistant_page_context(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('spd-assistant-imports', 'spd-assistant-imports', false, 5242880, array['application/json', 'text/markdown', 'text/plain'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "spd assistant imports admin read" on storage.objects;
create policy "spd assistant imports admin read"
on storage.objects for select to authenticated
using (
  bucket_id = 'spd-assistant-imports'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "spd assistant imports admin write" on storage.objects;
create policy "spd assistant imports admin write"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'spd-assistant-imports'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "spd assistant imports admin update" on storage.objects;
create policy "spd assistant imports admin update"
on storage.objects for update to authenticated
using (
  bucket_id = 'spd-assistant-imports'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
)
with check (
  bucket_id = 'spd-assistant-imports'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);

drop policy if exists "spd assistant imports admin delete" on storage.objects;
create policy "spd assistant imports admin delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'spd-assistant-imports'
  and public.is_privileged_role(array['super_admin', 'admin']::public.user_role[])
);
