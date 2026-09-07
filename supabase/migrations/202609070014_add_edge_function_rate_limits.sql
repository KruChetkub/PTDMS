-- Security Hardening Plan 2.11: shared, atomic Edge Function rate limits.
-- The counter table stays outside the exposed schema. Only service_role may
-- call the public SECURITY INVOKER entrypoint used by Edge Functions.

create schema if not exists private;

create table if not exists private.edge_function_rate_limits (
  rate_key text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  expires_at timestamptz not null,
  primary key (rate_key, window_started_at),
  constraint edge_function_rate_limits_key_length
    check (length(rate_key) between 1 and 200)
);

create index if not exists idx_edge_function_rate_limits_expires_at
on private.edge_function_rate_limits (expires_at);

revoke all on table private.edge_function_rate_limits
from public, anon, authenticated;
grant select, insert, update, delete
on table private.edge_function_rate_limits to service_role;
grant usage on schema private to service_role;

create or replace function public.consume_edge_function_rate_limit(
  p_rate_key text,
  p_request_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_started_at timestamptz;
  v_expires_at timestamptz;
  v_request_count integer;
begin
  if p_rate_key is null or length(p_rate_key) not between 1 and 200 then
    raise exception 'invalid rate key';
  end if;

  if p_request_limit not between 1 and 10000 then
    raise exception 'invalid request limit';
  end if;

  if p_window_seconds not between 1 and 86400 then
    raise exception 'invalid rate window';
  end if;

  v_window_started_at := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );
  v_expires_at := v_window_started_at
    + make_interval(secs => p_window_seconds);

  delete from private.edge_function_rate_limits
  where rate_key = p_rate_key
    and expires_at < v_now;

  -- Opportunistic cleanup prevents abandoned identifiers from accumulating
  -- without making every request scan all expired windows.
  if random() < 0.01 then
    delete from private.edge_function_rate_limits
    where expires_at < v_now;
  end if;

  insert into private.edge_function_rate_limits (
    rate_key,
    window_started_at,
    request_count,
    expires_at
  )
  values (p_rate_key, v_window_started_at, 1, v_expires_at)
  on conflict (rate_key, window_started_at) do update
  set request_count = private.edge_function_rate_limits.request_count + 1
  returning request_count into v_request_count;

  return query
  select
    v_request_count <= p_request_limit,
    greatest(p_request_limit - v_request_count, 0),
    case
      when v_request_count <= p_request_limit then 0
      else greatest(ceil(extract(epoch from v_expires_at - v_now))::integer, 1)
    end;
end;
$$;

revoke all on function public.consume_edge_function_rate_limit(text, integer, integer)
from public, anon, authenticated;
grant execute on function public.consume_edge_function_rate_limit(text, integer, integer)
to service_role;

notify pgrst, 'reload schema';
