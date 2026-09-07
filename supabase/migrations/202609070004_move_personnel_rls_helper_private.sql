-- Harden CSV #36. This function is an RLS helper, not a client RPC.
-- Moving the existing function preserves policy dependencies by OID while
-- removing it from the Data API's exposed public schema.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

alter function public.admin_can_access_personnel(uuid)
set schema private;

alter function private.admin_can_access_personnel(uuid)
set search_path = '';

revoke all on function private.admin_can_access_personnel(uuid)
from public, anon, authenticated;
grant execute on function private.admin_can_access_personnel(uuid)
to authenticated;

notify pgrst, 'reload schema';
