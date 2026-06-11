# SPD Service Management System

This folder documents the database ownership for the SPD Service module.

## Supabase Migration

Primary migration:

- `../migrations/202606110001_create_spd_service.sql`

## Table Ownership

SPD Service tables must stay separate from PTDMS training, strategy calendar, and IT asset tables.

- `spd_service_categories`
- `spd_service_tickets`
- `spd_service_ticket_timeline`
- `spd_service_satisfaction_surveys`
- `spd_service_notification_settings`

## Implementation Order

1. Create database schema, indexes, RLS policies, and starter categories.
2. Add frontend service functions under `src/services/spd-service.service.ts`.
3. Add dashboard UI under `src/features/spd-service/`.
4. Add ticket creation form using the existing authentication and profile data.
5. Add assignment and status workflow for responsible staff.
6. Add Telegram notification integration without creating a new login or user system.
7. Add satisfaction survey and reporting views.

## Guardrails

- Do not create a new login system.
- Do not create duplicate user tables.
- Do not add file upload/storage for this module.
- Use existing `profiles`, `auth.users`, and platform roles.
- Keep all new SPD Service tables prefixed with `spd_service_`.
