# PTDMS Graphify System Map

เอกสารนี้สรุปโครงสร้างระบบจาก `graphify-out/GRAPH_REPORT.md` และ `graphify-out/graph.json` เพื่อให้ AI หรือผู้พัฒนาคนถัดไปเข้าใจภาพรวมก่อนแก้โค้ด

อัปเดตจาก graphify run วันที่ `2026-06-15`

## ภาพรวมจากกราฟ

- ระบบมี `957 nodes`, `1693 edges`, `64 communities`
- ความสัมพันธ์ในกราฟเป็น `100% EXTRACTED` จากโค้ดและเอกสาร ไม่มี inferred edges
- ไม่พบ import cycle
- มี isolated หรือ weakly connected nodes จำนวนมาก (`402 nodes`) จึงควรตรวจโค้ดจริงประกอบเมื่อแก้ส่วนที่ graph เชื่อมโยงน้อย
- ไฟล์ graph หลักอยู่ที่ `graphify-out/graph.json`
- รายงานอ่านง่ายอยู่ที่ `graphify-out/GRAPH_REPORT.md`
- ภาพ graph แบบ interactive อยู่ที่ `graphify-out/graph.html`
- call flow เฉพาะระบบอยู่ที่ `graphify-out/PTDMS-callflow.html`

## Tech Stack และ Entry Points

ระบบเป็น React + TypeScript + Vite frontend ที่ใช้ Supabase เป็น backend/data layer และมี Vercel API/Supabase Edge Function บางส่วน

ไฟล์ entry point สำคัญ:

- `src/main.tsx` โหลด router หลัก
- `src/app/router.tsx` เป็น route registry กลางของแอป และเป็น node ที่เชื่อมต่อมากที่สุดในกราฟ
- `src/components/auth/ProtectedRoute.tsx` คุม route ที่ต้อง login และ role permission
- `src/components/auth/GuestRoute.tsx` คุมหน้า guest เช่น login/register
- `src/components/layout/AppLayout.tsx` เป็น layout หลักหลังเข้าแอป
- `src/lib/env.ts` อ่าน env สำหรับ Supabase
- `src/lib/supabase.ts` สร้าง Supabase client
- `src/types/database.types.ts` เป็น type contract หลักของตาราง Supabase

คำสั่งจาก `package.json`:

- `npm run dev` สำหรับ local dev
- `npm run build` สำหรับ TypeScript build + Vite build
- `npm run preview` สำหรับ preview build

## Core Bridge Nodes

node ต่อไปนี้เป็นตัวเชื่อมข้ามโมดูล ถ้าแก้ควรตรวจผลกระทบหลายหน้า:

- `src/app/router.tsx` เชื่อม route ไปยัง feature pages เกือบทั้งหมด
- `src/stores/auth.store.ts` / `useAuthStore` เชื่อม authentication, profile, RBAC, SPD Service, Assistant, Admin, Portal, Settings
- `src/lib/supabase.ts` / `supabase` เชื่อม service layer เกือบทุก domain
- `src/lib/supabase-query.ts` / `runSupabaseQuery()` เป็น helper กลางสำหรับ query flow บาง service เช่น course, personnel, training, site content
- `src/types/database.types.ts` เป็น type boundary ระหว่าง frontend กับ Supabase schema
- `src/components/ui/PageHeader.tsx` ใช้ซ้ำหลายหน้า dashboard/admin/reporting
- `src/utils/cn.ts` เป็น utility รวม className ที่ใช้ใน UI components หลายจุด
- `src/utils/thaiDate.ts` เป็น utility วันที่ไทยและปีงบประมาณที่กระทบ training/personnel/reporting

## Route และ Page Map

`src/app/router.tsx` import และ mount หน้าเหล่านี้เป็นหลัก:

- Auth: `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `AuthCallbackPage`, `PendingApprovalPage`
- Public site: `PublicHomePage`
- Main portal: `PortalPage`
- Dashboard/reporting: `DashboardPage`, `AnalyticsPage`, `ReportsPage`, `RecommendationsPage`
- Personnel/training: `PersonnelListPage`, `ProfilePage`, `IndividualProfilePage`, `TrainingRecordsPage`, `SelfServicePage`
- Admin/security: `UserManagementPage`, `SecurityPage`, `SiteManagerPage`
- IT assets: `ItAssetsPage`, `ItAssetsManagePage`
- SPD Service: `SpdServiceDashboardPage`, `SpdServiceRequestPage`, `SpdServiceTicketListPage`, `SpdServiceMyRequestsPage`, `SpdServiceTelegramSettingsPage`
- Strategy calendar: `StrategyCalendarPage`, `MeetingRoomBookingPage`
- System pages: `ForbiddenPage`, `NotFoundPage`

ถ้าจะเพิ่มหน้าใหม่ ให้เริ่มจาก `src/app/router.tsx` แล้วตรวจว่าต้องผ่าน `ProtectedRoute`, role permission, และ layout ใด

## Authentication และ Authorization

ไฟล์หลัก:

- `src/stores/auth.store.ts`
- `src/types/roles.ts`
- `src/components/auth/ProtectedRoute.tsx`
- `src/components/auth/GuestRoute.tsx`
- `src/features/auth/auth.schemas.ts`
- `src/features/auth/pages/*`

แนวคิดจากกราฟ:

- `useAuthStore` เป็น node ที่มี edge สูงมาก (`55 edges`) และถูกเรียกจากหลาย feature
- Auth state เชื่อมกับ Supabase client, profile data, role/status, route guards และ UI หลายหน้า
- หน้า SPD Service, Assistant, Register, Admin และ Personnel เรียก `useAuthStore` โดยตรง

ข้อควรระวัง:

- การเปลี่ยน shape ของ auth/profile/role ใน store ต้องไล่ตรวจทุก feature ที่เรียก `useAuthStore`
- การเพิ่ม role ใหม่ต้องตรวจทั้ง `src/types/roles.ts`, route guard, UI navigation และ Supabase/RLS ฝั่งฐานข้อมูล

## Supabase และ Data Access

ไฟล์หลัก:

- `src/lib/env.ts`
- `src/lib/supabase.ts`
- `src/lib/supabase-query.ts`
- `src/types/database.types.ts`
- `supabase/`

รูปแบบ data access ที่พบ:

- หลาย service import `supabase` ตรงจาก `src/lib/supabase.ts`
- บาง service ใช้ `runSupabaseQuery()` เพื่อ normalize error และ result flow
- `database.types.ts` รวม type ของตารางหลัก เช่น `Profile`, `TrainingRecord`, `Certificate`, `DevelopmentAnalysis`, `SpdServiceTicket`, `SpdServiceCategory`, `SpdServiceSatisfactionSurvey`, `SpdServiceNotificationSettings`

service ที่เชื่อม Supabase โดยตรง:

- `src/services/admin.service.ts`
- `src/services/analytics.service.ts`
- `src/services/audit.service.ts`
- `src/services/course.service.ts`
- `src/services/dashboard.service.ts`
- `src/services/it-asset.service.ts`
- `src/services/meeting-room-reservation.service.ts`
- `src/services/personnel.service.ts`
- `src/services/recommendation.service.ts`
- `src/services/spd-assistant.service.ts`
- `src/services/spd-service.service.ts`
- `src/services/strategy-calendar.service.ts`
- `src/services/training.service.ts`
- `src/stores/auth.store.ts`

ข้อควรระวัง:

- ถ้าแก้ schema ต้องแก้ migration/type ใน `src/types/database.types.ts` และ service ที่เกี่ยวข้องพร้อมกัน
- ถ้าแก้ error handling ของ `runSupabaseQuery()` ให้ตรวจ `course.service.ts`, `personnel.service.ts`, `training.service.ts`, `siteContent.supabase.ts`
- ถ้าเพิ่ม table ใหม่ ให้สร้าง type, service function, route/page, และ RLS policy ให้ครบ

## Feature Communities

### Auth, Router, Layout, Shared UI

ไฟล์หลัก:

- `src/app/router.tsx`
- `src/stores/auth.store.ts`
- `src/components/layout/AppLayout.tsx`
- `src/components/auth/ProtectedRoute.tsx`
- `src/components/ui/ConfirmModal.tsx`
- `src/components/ui/PageHeader.tsx`
- `src/utils/cn.ts`
- `src/types/roles.ts`

บทบาท:

- เป็นโครงกระดูกของแอป
- เชื่อม page/module ทั้งหมดผ่าน route และ auth state
- utility UI เช่น `cn()` และ modal/header ถูกใช้ซ้ำในหลาย feature

### Admin และ Security

ไฟล์หลัก:

- `src/features/admin/UserManagementPage.tsx`
- `src/features/admin/SecurityPage.tsx`
- `src/services/admin.service.ts`
- `src/services/audit.service.ts`
- `src/lib/supabase.ts`
- `src/types/database.types.ts`

บทบาท:

- จัดการผู้ใช้ โปรไฟล์ สถานะ/role และ security view
- ใช้ `Profile` และ role/status types ร่วมกับ auth layer

### Personnel, Profile, Reports

ไฟล์หลัก:

- `src/services/personnel.service.ts`
- `src/features/personnel/PersonnelListPage.tsx`
- `src/features/personnel/ProfilePage.tsx`
- `src/features/personnel/IndividualProfilePage.tsx`
- `src/features/personnel/components/IndividualProfileView.tsx`
- `src/features/reports/ReportsPage.tsx`
- `src/utils/thaiDate.ts`

บทบาท:

- แสดงและแก้ข้อมูลบุคลากร
- เชื่อม training records, certificates, development analysis และปีงบประมาณไทย
- `IndividualProfileView.tsx` เป็น UI ที่รวมข้อมูลหลายชนิดของบุคลากร

### Training และ Self-Service

ไฟล์หลัก:

- `src/services/training.service.ts`
- `src/features/training-records/TrainingRecordsPage.tsx`
- `src/features/self-service/SelfServicePage.tsx`
- `src/features/self-service/training-form.schema.ts`
- `src/components/training/TrainingForm.tsx`
- `src/utils/thaiDate.ts`

บทบาท:

- CRUD training records
- form validation ผ่าน schema
- self-service training request/form flow

ข้อควรระวัง:

- `TrainingForm()` เรียก `formatThaiLongDate()`
- training schema และ UI form ต้องแก้คู่กันเมื่อเพิ่ม field

### Dashboard, Analytics, Courses, Recommendations

ไฟล์หลัก:

- `src/features/dashboard/DashboardPage.tsx`
- `src/services/dashboard.service.ts`
- `src/features/analytics/AnalyticsPage.tsx`
- `src/services/analytics.service.ts`
- `src/features/courses/CourseListPage.tsx`
- `src/services/course.service.ts`
- `src/features/recommendations/RecommendationsPage.tsx`
- `src/services/recommendation.service.ts`

บทบาท:

- Dashboard และ analytics สรุปข้อมูลจาก training/personnel/course
- recommendation logic อยู่หนักใน `recommendation.service.ts`
- course directory และ attendee flow อยู่ใน `course.service.ts`

ข้อควรระวัง:

- หน้า dashboard/analytics มี logic export/chart SVG ใน page component
- ถ้าแก้ data aggregation ให้ตรวจทั้ง service และ UI ที่แสดงผล

### IT Assets

ไฟล์หลัก:

- `src/features/it-assets/ItAssetsPage.tsx`
- `src/features/it-assets/ItAssetsManagePage.tsx`
- `src/features/it-assets/types.ts`
- `src/features/it-assets/utils/assetMetrics.ts`
- `src/features/it-assets/components/ItAssetDetailModal.tsx`
- `src/features/it-assets/components/ItAssetStatCard.tsx`
- `src/services/it-asset.service.ts`
- `src/services/it-asset-evaluation.service.ts`

บทบาท:

- จัดการ asset, dashboard/stat, evaluation และ CSV/report parsing
- `ItAssetsManagePage.tsx` เป็น node ใหญ่ของ feature นี้

### Public Home และ Site Manager

ไฟล์หลัก:

- `src/features/public-home/pages/PublicHomePage.tsx`
- `src/features/public-home/components/*`
- `src/features/public-home/data/publicHome.mock.ts`
- `src/features/public-home/types/publicHome.types.ts`
- `src/features/site-content/hooks/useSiteContent.ts`
- `src/features/site-content/data/siteContent.defaults.ts`
- `src/features/site-content/services/siteContent.storage.ts`
- `src/features/site-content/services/siteContent.supabase.ts`
- `src/features/site-content/services/siteContent.assets.ts`
- `src/features/site-content/types/siteContent.types.ts`
- `src/features/site-manager/pages/SiteManagerPage.tsx`
- `src/features/site-manager/components/*`
- `src/features/site-manager/types/siteManager.types.ts`

บทบาท:

- Public home อ่าน published content ผ่าน `usePublishedSiteContent()`
- Site manager แก้ draft content ผ่าน `useSiteContentDraft()`
- Content มีทั้ง local storage flow และ Supabase persistence
- Logo/asset upload ใช้ `siteContent.assets.ts` และ Supabase storage

ข้อควรระวัง:

- `siteContent.types.ts` เป็น contract สำคัญของทั้ง public home และ editor
- `siteContent.storage.ts` มี fallback/default normalization
- `siteContent.supabase.ts` ใช้ `runSupabaseQuery()` จึงต้องตรวจ error flow ด้วย

### SPD Assistant

ไฟล์หลัก:

- `src/services/spd-assistant.service.ts`
- `src/features/spd-assistant/SpdAssistantProvider.tsx`
- `src/features/spd-assistant/SpdAssistantWidget.tsx`
- `src/features/spd-assistant/SpdAssistantAdminPage.tsx`
- `src/features/spd-assistant/SpdAssistantSuperAdminPage.tsx`
- `api/spd-assistant-gemini.ts`

บทบาท:

- Frontend assistant service จัดการ conversation, route context, extractive answer และ Supabase logging
- Vercel API `api/spd-assistant-gemini.ts` เรียก Gemini และมี helper เช่น `callGemini()`, `cleanGeminiText()`, `isStrongMatch()`, `sendJson()`
- Provider/admin pages เชื่อม `useAuthStore`

ข้อควรระวัง:

- ถ้าแก้ assistant response shape ให้ตรวจทั้ง service, provider/widget, admin pages และ API endpoint
- API node บางส่วนถูกจัดเป็น weakly connected เพราะเป็น serverless boundary แยกจาก frontend imports

### SPD Service

เอกสารและขอบเขต:

- `SPD_SERVICE.md`
- `src/features/spd-service/README.md`
- `supabase/spd-service/README.md`

Frontend pages:

- `src/features/spd-service/SpdServiceDashboardPage.tsx`
- `src/features/spd-service/SpdServiceRequestPage.tsx`
- `src/features/spd-service/SpdServiceTicketListPage.tsx`
- `src/features/spd-service/SpdServiceMyRequestsPage.tsx`
- `src/features/spd-service/SpdServiceTelegramSettingsPage.tsx`

Service/type/backend:

- `src/services/spd-service.service.ts`
- `src/types/database.types.ts`
- `supabase/functions/spd-service-telegram-notify/index.ts`

บทบาท:

- Request page สร้าง ticket ผ่าน `createSpdServiceTicket()` และโหลด category ผ่าน `getSpdServiceCategories()`
- Ticket list page โหลดรายการผ่าน `getSpdServiceTickets()`
- Dashboard page โหลดข้อมูลผ่าน `getSpdServiceDashboardData()`, เปิด detail ผ่าน `getSpdServiceTicketDetail()`, update workflow ผ่าน `updateSpdServiceTicketWorkflow()`, delete ผ่าน `deleteSpdServiceTicket()`
- My requests page โหลด ticket ของผู้ใช้ผ่าน `getMySpdServiceTickets()`, โหลด satisfaction survey และสร้าง survey ผ่าน `createSpdServiceSatisfactionSurvey()`
- Telegram settings page ใช้ setting helpers ใน `spd-service.service.ts`
- Edge function `spd-service-telegram-notify` สร้างข้อความและส่งแจ้งเตือน Telegram

functions สำคัญใน `src/services/spd-service.service.ts`:

- `getSpdServiceDashboardData()`
- `getSpdServiceTickets()`
- `getMySpdServiceTickets()`
- `getSpdServiceTicketDetail()`
- `getSpdServiceCategories()`
- `createSpdServiceTicket()`
- `notifySpdServiceTicketCreated()`
- `updateSpdServiceTicketWorkflow()`
- `deleteSpdServiceTicket()`
- `createSpdServiceSatisfactionSurvey()`
- `getMySpdServiceSatisfactionSurveys()`
- `getSpdServiceAdminRecipients()`
- `getSpdServiceTelegramSettings()`
- `saveSpdServiceTelegramSettings()`

ข้อควรระวัง:

- SPD Service มีหลาย community แยกตามหน้า แต่ใช้ service เดียวกันเป็นศูนย์กลาง
- Status/urgency/category types มาจาก `src/types/database.types.ts`
- หลายหน้าใช้ `useAuthStore` และ `cn()` ร่วมกัน
- ถ้าแก้ workflow/status ต้องตรวจ dashboard, ticket list, my requests, service function, database types, migration/RLS และ Telegram notification

### Strategy Calendar และ Meeting Room

ไฟล์หลัก:

- `src/features/strategy-calendar/StrategyCalendarPage.tsx`
- `src/services/strategy-calendar.service.ts`
- `src/features/strategy-calendar/MeetingRoomBookingPage.tsx`
- `src/services/meeting-room-reservation.service.ts`

บทบาท:

- Strategy calendar จัดการ event, calendar days, date range และ detail modal
- Meeting room booking จัดการ reservation, time slots, date key และ validation ฝั่ง UI/service

ข้อควรระวัง:

- page components มี helper date/time ภายในหลายตัว
- ถ้าเปลี่ยน date format ให้ตรวจทั้ง service payload และ UI helpers

## Documentation Communities

เอกสารหลักที่ graph เชื่อม:

- `README.md` ให้ภาพรวม stack และ setup
- `PTDMS_DEVELOPMENT_PLAN.md` เป็น specification ใหญ่ของระบบ มีหัวข้อ architecture, database, RLS, auth, pages, validation, reporting, storage, security, deployment, testing, development phases
- `SPD_SERVICE.md` เป็น specification เฉพาะ SPD Service Management System
- `Strategy_Calendar.md` เป็น specification เฉพาะ strategy calendar
- `SPD_COLOR_SYSTEM.md` เป็นแนวทางสี/visual system ของ SPD

เมื่อต้องเพิ่ม feature ใหญ่ ควรตรวจเอกสารที่เกี่ยวข้องก่อนลงโค้ด เพราะ graph พบว่าเอกสารเหล่านี้เป็น source ของ domain concepts จำนวนมาก

## Development Rules for AI

ก่อนแก้โค้ด:

- อ่าน `src/app/router.tsx` ถ้างานเกี่ยวกับหน้าใหม่/route/navigation
- อ่าน `src/stores/auth.store.ts` และ `src/types/roles.ts` ถ้างานเกี่ยวกับ login, profile, role, permission
- อ่าน `src/lib/supabase.ts`, `src/lib/supabase-query.ts`, `src/types/database.types.ts` ถ้างานแตะ data/schema
- อ่าน service ของ feature ก่อนแก้ page component เพราะ data contract มักอยู่ที่ service
- อ่านเอกสาร domain เช่น `PTDMS_DEVELOPMENT_PLAN.md`, `SPD_SERVICE.md`, `Strategy_Calendar.md` เมื่อแก้ flow สำคัญ

เมื่อเพิ่ม/แก้ feature:

- วาง data access ใน `src/services/*.service.ts`
- ใช้ type จาก `src/types/database.types.ts` หรือ type เฉพาะ feature ที่มีอยู่แล้ว
- ใช้ shared UI/utilities ที่มี เช่น `PageHeader`, `ConfirmModal`, `cn`, `thaiDate`
- ตรวจ route guard และ role permission ใน router/ProtectedRoute
- ตรวจ Supabase RLS/migration ถ้าเพิ่ม table หรือเปลี่ยน workflow ที่เกี่ยวกับสิทธิ์
- รัน build/test ที่เหมาะสมหลังแก้

เมื่อแก้ shared nodes:

- `useAuthStore`: ตรวจทุกหน้า protected และ feature ที่ใช้ profile/role
- `supabase`: ตรวจ service layer ทั้งหมด
- `runSupabaseQuery`: ตรวจ services ที่พึ่ง helper นี้
- `database.types.ts`: ตรวจทุก service/page ที่ import type จาก schema
- `thaiDate.ts`: ตรวจ training, personnel, reports, calendar
- `cn.ts`: ผลกระทบเป็น UI class composition ทั่วระบบ

## Known Graph Gaps

- graph run นี้เป็น `cluster-only mode` จึงไม่มี corpus file stats ในรายงาน
- community labels ใน `.graphify_labels.json` ยังเป็นชื่อทั่วไป (`Community 0`, `Community 1`, ...)
- มี `402` isolated/weakly connected nodes ซึ่งอาจเป็น type, config, serverless boundary หรือส่วนที่ graph ไม่จับความสัมพันธ์ลึกพอ
- Graph เป็นแผนที่ช่วยนำทาง ไม่ใช่ source of truth สุดท้าย ต้องยืนยันด้วยโค้ดจริงก่อนแก้ behavior สำคัญ

## Quick Starting Points

- งาน auth/RBAC: เริ่มที่ `src/stores/auth.store.ts`, `src/types/roles.ts`, `src/components/auth/ProtectedRoute.tsx`, `src/app/router.tsx`
- งาน Supabase/schema: เริ่มที่ `src/types/database.types.ts`, `src/lib/supabase.ts`, `src/lib/supabase-query.ts`, service ของ feature, และ `supabase/`
- งาน SPD Service: เริ่มที่ `SPD_SERVICE.md`, `src/features/spd-service/README.md`, `supabase/spd-service/README.md`, `src/services/spd-service.service.ts`
- งานหน้า dashboard SPD: เริ่มที่ `src/features/spd-service/SpdServiceDashboardPage.tsx` และ `getSpdServiceDashboardData()`
- งาน notification Telegram: เริ่มที่ `supabase/functions/spd-service-telegram-notify/index.ts` และ helpers ใน `src/services/spd-service.service.ts`
- งาน public home/site manager: เริ่มที่ `src/features/site-content/*`, `src/features/public-home/*`, `src/features/site-manager/*`
- งาน calendar/meeting room: เริ่มที่ `src/features/strategy-calendar/*` และ service ที่เกี่ยวข้อง
- งาน report/analytics/recommendation: เริ่มที่ `src/services/dashboard.service.ts`, `src/services/analytics.service.ts`, `src/services/recommendation.service.ts`

