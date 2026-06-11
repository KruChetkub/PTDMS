# SPD Service Management System

Frontend module folder for SPD Service.

## Scope

This module is a separate application area inside the existing SPD/PTDMS platform.

## Current Entry Points

- Dashboard page: `SpdServiceDashboardPage.tsx`
- Data access: `../../services/spd-service.service.ts`
- Route: `/spd-service`
- Portal card: `src/features/portal/PortalPage.tsx`

## Development Sequence

1. Dashboard for Super Admin, Admin, and Executive.
2. Ticket creation for platform users.
3. Staff workflow for accepting and updating tickets.
4. Admin configuration for service categories and Telegram settings.
5. Satisfaction survey after ticket completion.
6. Reporting and KPI export.

## Separation Rule

Do not mix SPD Service code into PTDMS training, strategy calendar, or IT asset folders.
