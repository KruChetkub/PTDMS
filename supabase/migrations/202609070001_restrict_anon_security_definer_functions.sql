-- Restrict direct anonymous access to SECURITY DEFINER functions.
--
-- Three RPCs intentionally remain anonymous because the public website uses them:
--   record_public_page_visit(uuid, text, text, boolean, text)
--   get_public_visit_stats()
--   increment_public_web_page_view_count(uuid)
-- They require a separate design decision because revoking anon would break the
-- public analytics and public page-view features.

-- Trigger-only functions. PostgreSQL triggers do not require callers to have
-- direct EXECUTE permission on their trigger functions.
revoke all on function public.capture_public_performance_result_history() from public, anon, authenticated;
revoke all on function public.capture_public_research_item_history() from public, anon, authenticated;
revoke all on function public.capture_site_content_history() from public, anon, authenticated;
revoke all on function public.clear_personnel_only_permissions_on_role_change() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.protect_force_password_change_fields() from public, anon, authenticated;
revoke all on function public.protect_super_admin_training_records() from public, anon, authenticated;
revoke all on function public.validate_public_home_section() from public, anon, authenticated;
revoke all on function public.validate_public_repository_category() from public, anon, authenticated;

-- Internal/RPC functions that must never be callable before authentication.
-- Keep authenticated access for now; the next hardening phase narrows that role
-- after checking each function's authorization contract.
revoke all on function public.create_training_record_with_details(
  uuid, text, text, text, text, date, integer, text, text, text, text, text
) from public, anon;
grant execute on function public.create_training_record_with_details(
  uuid, text, text, text, text, date, integer, text, text, text, text, text
) to authenticated;

revoke all on function public.current_user_role() from public, anon;
grant execute on function public.current_user_role() to authenticated;

revoke all on function public.delete_user(uuid) from public, anon;
grant execute on function public.delete_user(uuid) to authenticated;

revoke all on function public.generate_spd_service_ticket_no(text, date) from public, anon;
grant execute on function public.generate_spd_service_ticket_no(text, date) to authenticated;

revoke all on function public.get_spd_service_ai_chatgpt_booking_calendar(date, date) from public, anon;
grant execute on function public.get_spd_service_ai_chatgpt_booking_calendar(date, date) to authenticated;

revoke all on function public.increment_audit_log_retry_count(uuid[]) from public, anon;
grant execute on function public.increment_audit_log_retry_count(uuid[]) to authenticated, service_role;

revoke all on function public.is_privileged_role(public.user_role[]) from public, anon;
grant execute on function public.is_privileged_role(public.user_role[]) to authenticated;

revoke all on function public.list_user_management_profiles() from public, anon;
grant execute on function public.list_user_management_profiles() to authenticated;

revoke all on function public.update_own_profile_details(
  text, text, text, text, text, text, text, date, text
) from public, anon;
grant execute on function public.update_own_profile_details(
  text, text, text, text, text, text, text, date, text
) to authenticated;

revoke all on function public.update_own_profile_details(
  text, text, text, text, text, text, text, date, date, text
) from public, anon;
grant execute on function public.update_own_profile_details(
  text, text, text, text, text, text, text, date, date, text
) to authenticated;

revoke all on function public.update_user_profile_details(
  uuid, text, text, text, text, text, text, text, date, text
) from public, anon;
grant execute on function public.update_user_profile_details(
  uuid, text, text, text, text, text, text, text, date, text
) to authenticated;

revoke all on function public.update_user_profile_details(
  uuid, text, text, text, text, text, text, text, date, date, text
) from public, anon;
grant execute on function public.update_user_profile_details(
  uuid, text, text, text, text, text, text, text, date, date, text
) to authenticated;

notify pgrst, 'reload schema';
