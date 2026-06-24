# Graph Report - C:\Users\piche\Documents\PTDMS  (2026-06-19)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1056 nodes · 1807 edges · 77 communities (72 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_User Authentication|User Authentication]]
- [[_COMMUNITY_Training Records|Training Records]]
- [[_COMMUNITY_User Management Forms|User Management Forms]]
- [[_COMMUNITY_Recommendations Engine|Recommendations Engine]]
- [[_COMMUNITY_Strategy Calendar|Strategy Calendar]]
- [[_COMMUNITY_Security and Analytics|Security and Analytics]]
- [[_COMMUNITY_IT Asset Management|IT Asset Management]]
- [[_COMMUNITY_Project Dependencies|Project Dependencies]]
- [[_COMMUNITY_Dashboard Operations|Dashboard Operations]]
- [[_COMMUNITY_Site Manager UI|Site Manager UI]]
- [[_COMMUNITY_TypeScript Configuration|TypeScript Configuration]]
- [[_COMMUNITY_Process Management|Process Management]]
- [[_COMMUNITY_Input Data Management|Input Data Management]]
- [[_COMMUNITY_Home Page Sections|Home Page Sections]]
- [[_COMMUNITY_Personnel Management|Personnel Management]]
- [[_COMMUNITY_Meeting Room Booking|Meeting Room Booking]]
- [[_COMMUNITY_PTDMS Development Plan|PTDMS Development Plan]]
- [[_COMMUNITY_Database Design|Database Design]]
- [[_COMMUNITY_TypeScript Configuration|TypeScript Configuration]]
- [[_COMMUNITY_Development Phases|Development Phases]]
- [[_COMMUNITY_Output Dashboard|Output Dashboard]]
- [[_COMMUNITY_Application Pages|Application Pages]]
- [[_COMMUNITY_Supabase Setup|Supabase Setup]]
- [[_COMMUNITY_Data Cleanup|Data Cleanup]]
- [[_COMMUNITY_Security Controls|Security Controls]]
- [[_COMMUNITY_Testing Plan|Testing Plan]]
- [[_COMMUNITY_Deployment Strategy|Deployment Strategy]]
- [[_COMMUNITY_Validation Stack|Validation Stack]]
- [[_COMMUNITY_Search & Analytics|Search & Analytics]]
- [[_COMMUNITY_Reporting & Export|Reporting & Export]]
- [[_COMMUNITY_Project Overview|Project Overview]]
- [[_COMMUNITY_Enterprise Architecture|Enterprise Architecture]]
- [[_COMMUNITY_Row Level Security Strategy|Row Level Security Strategy]]
- [[_COMMUNITY_Authentication & Session Management|Authentication & Session Management]]
- [[_COMMUNITY_Database Constraints|Database Constraints]]
- [[_COMMUNITY_Graphify Documentation|Graphify Documentation]]
- [[_COMMUNITY_Responsive Design Guidelines|Responsive Design Guidelines]]
- [[_COMMUNITY_Frontend Environment Variables|Frontend Environment Variables]]
- [[_COMMUNITY_SPD Service Overview|SPD Service Overview]]
- [[_COMMUNITY_TypeScript Configuration|TypeScript Configuration]]
- [[_COMMUNITY_Placeholder Component|Placeholder Component]]
- [[_COMMUNITY_Tailwind CSS Configuration|Tailwind CSS Configuration]]
- [[_COMMUNITY_Vercel Rewrites|Vercel Rewrites]]
- [[_COMMUNITY_Spd Service Management|Spd Service Management]]
- [[_COMMUNITY_Account Settings|Account Settings]]
- [[_COMMUNITY_Spd Service Services|Spd Service Services]]
- [[_COMMUNITY_Spd Service Requests|Spd Service Requests]]
- [[_COMMUNITY_Personnel Profile|Personnel Profile]]
- [[_COMMUNITY_Database Types|Database Types]]
- [[_COMMUNITY_General Utilities|General Utilities]]
- [[_COMMUNITY_Self Service Form|Self Service Form]]
- [[_COMMUNITY_Supabase Queries|Supabase Queries]]
- [[_COMMUNITY_Gemini Integration|Gemini Integration]]
- [[_COMMUNITY_Service Ticket Management|Service Ticket Management]]
- [[_COMMUNITY_Thai Date Formatting|Thai Date Formatting]]
- [[_COMMUNITY_Service Request Management|Service Request Management]]
- [[_COMMUNITY_Development Overview|Development Overview]]
- [[_COMMUNITY_Migration & Ownership|Migration & Ownership]]
- [[_COMMUNITY_Project Links|Project Links]]
- [[_COMMUNITY_Authentication Schemas|Authentication Schemas]]
- [[_COMMUNITY_Course Directory|Course Directory]]
- [[_COMMUNITY_Protected Routes|Protected Routes]]
- [[_COMMUNITY_SPD Design System|SPD Design System]]
- [[_COMMUNITY_App Layout|App Layout]]
- [[_COMMUNITY_Design Identity|Design Identity]]
- [[_COMMUNITY_Disease Control Plan|Disease Control Plan]]
- [[_COMMUNITY_Annual Work Plan|Annual Work Plan]]
- [[_COMMUNITY_Risk Management Strategy|Risk Management Strategy]]
- [[_COMMUNITY_Policy Management|Policy Management]]
- [[_COMMUNITY_SpdAssistant Integration|SpdAssistant Integration]]
- [[_COMMUNITY_UI Typography|UI Typography]]
- [[_COMMUNITY_Color Palette|Color Palette]]

## God Nodes (most connected - your core abstractions)
1. `useAuthStore` - 55 edges
2. `แผนพัฒนาระบบ PTDMS` - 29 edges
3. `cn()` - 22 edges
4. `supabase` - 20 edges
5. `runSupabaseQuery()` - 19 edges
6. `PageHeader()` - 18 edges
7. `P - Process` - 18 edges
8. `compilerOptions` - 17 edges
9. `Profile` - 12 edges
10. `I - Input` - 12 edges

## Surprising Connections (you probably didn't know these)
- `RegisterPage()` --calls--> `useAuthStore`  [EXTRACTED]
  src/features/auth/pages/RegisterPage.tsx → src/stores/auth.store.ts
- `SpdAssistantAdminPage()` --calls--> `useAuthStore`  [EXTRACTED]
  src/features/spd-assistant/SpdAssistantAdminPage.tsx → src/stores/auth.store.ts
- `SpdAssistantProvider()` --calls--> `useAuthStore`  [EXTRACTED]
  src/features/spd-assistant/SpdAssistantProvider.tsx → src/stores/auth.store.ts
- `DashboardStat()` --calls--> `cn()`  [EXTRACTED]
  src/features/spd-service/SpdServiceDashboardPage.tsx → src/utils/cn.ts
- `ProtectedRoute()` --calls--> `useAuthStore`  [EXTRACTED]
  src/components/auth/ProtectedRoute.tsx → src/stores/auth.store.ts

## Import Cycles
- None detected.

## Communities (77 total, 5 thin omitted)

### Community 0 - "User Authentication"
Cohesion: 0.17
Nodes (15): UserManagementPage(), router, GuestRoute(), IndividualProfileView(), AuthCallbackPage(), PendingApprovalPage(), IndividualProfilePage(), ProfilePage() (+7 more)

### Community 1 - "Training Records"
Cohesion: 0.19
Nodes (13): ReportsPage(), getMonthFromDate(), createTrainingRecord(), CreateTrainingRecordInput, deleteTrainingRecord(), emptyToNull(), getTrainingRecordDetails(), listTrainingRecords() (+5 more)

### Community 2 - "User Management Forms"
Cohesion: 0.13
Nodes (19): CreateFormState, createRoleOptions, EditFormState, educationOptions, employmentTypeOptions, formatISOToThaiDate(), genderLabels, getCreateUserErrorMessage() (+11 more)

### Community 3 - "Recommendations Engine"
Cohesion: 0.09
Nodes (30): formatDateTime(), priorityLabels, priorityStyles, RecommendationsPage(), buildCourseCandidates(), buildCourseRecommendations(), buildExecutiveInsights(), buildReason() (+22 more)

### Community 4 - "Strategy Calendar"
Cohesion: 0.07
Nodes (34): cancelStrategyEvent(), createStrategyEvent(), listStrategyEvents(), restoreStrategyEvent(), StrategyEventForm, StrategyEventRow, toEventInsert(), updateStrategyEvent() (+26 more)

### Community 5 - "Security and Analytics"
Cohesion: 0.06
Nodes (29): SecurityPage(), AnalyticsPage(), buildChartSvg(), COLORS, copyComputedStyles(), escapeSvgText(), ExportDetail, ExportKey (+21 more)

### Community 6 - "IT Asset Management"
Cohesion: 0.06
Nodes (47): ItAssetDetailModal(), ItAssetDetailModalProps, ItAssetFilterSection(), ItAssetFilterSectionProps, ItAssetStatCard(), ItAssetStatCardProps, toneClasses, assetTypeOptions (+39 more)

### Community 7 - "Project Dependencies"
Cohesion: 0.07
Nodes (29): dependencies, clsx, @hookform/resolvers, lucide-react, react, react-dom, react-hook-form, react-router-dom (+21 more)

### Community 8 - "Dashboard Operations"
Cohesion: 0.16
Nodes (10): buildElementSvg(), copyComputedStyles(), DashboardPage(), emptySummary, escapeSvgText(), ExportDetail, ExportKey, genderColors (+2 more)

### Community 9 - "Site Manager UI"
Cohesion: 0.06
Nodes (52): SiteManagerBannerPreview(), SiteManagerBannerPreviewProps, SiteManagerBrandingEditor(), SiteManagerBrandingEditorProps, clampOverlayOpacity(), SiteManagerContentEditor(), SiteManagerContentEditorProps, statusOptions (+44 more)

### Community 10 - "TypeScript Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+10 more)

### Community 11 - "Process Management"
Cohesion: 0.11
Nodes (18): 4.12 เป้าหมายของ Process, 4.13 Frontend Stack, 4.14 Backend & Database, 4.15 Hosting & Deployment, 4.16 Responsive Design Requirements, 4.17 Authentication Flow, 4.18 Security Architecture, 4.19 Role-Based Access Control (+10 more)

### Community 12 - "Input Data Management"
Cohesion: 0.12
Nodes (17): 4.10 วิธีนำเข้าข้อมูล, 4.11 Security Input Validation, 4.1 เป้าหมายของ Input, 4.2 ข้อมูลผู้ใช้งานระบบ: Users, 4.3 ข้อมูลโปรไฟล์บุคลากร: Profiles, 4.4 ระดับผู้ใช้งาน: RBAC Roles, 4.5 ข้อมูลการอบรม: Training Records, 4.6 ข้อมูลใบประกาศ: Certificates (+9 more)

### Community 13 - "Home Page Sections"
Cohesion: 0.06
Nodes (43): HomeFaqSection(), HomeFaqSectionProps, HomeFooter(), HomeHeroBanner(), HomeHeroBannerProps, HomeMobileSectionLauncher(), HomeMobileSectionLauncherProps, MobileSectionId (+35 more)

### Community 14 - "Personnel Management"
Cohesion: 0.07
Nodes (40): PersonnelListPage(), PersonnelSummary, askSpdAssistant(), askSpdAssistantGemini(), AskSpdAssistantPayload, AskSpdAssistantResponse, createConversation(), escapeIlikeTerm() (+32 more)

### Community 15 - "Meeting Room Booking"
Cohesion: 0.10
Nodes (26): cancelMeetingRoomReservation(), createMeetingRoomReservation(), listAllMeetingRoomReservations(), listMeetingRoomReservations(), MeetingRoomReservationForm, MeetingRoomReservationRow, toReservationPayload(), updateMeetingRoomReservation() (+18 more)

### Community 16 - "PTDMS Development Plan"
Cohesion: 0.11
Nodes (17): 13.1 Storage Buckets, 13.2 Storage Security, 13. Supabase Storage, 14.1 Events ที่ต้องเก็บ, 14.2 Audit Log Metadata, 14. Audit Logging, 17. Suggested Project Structure, 22.1 เอกสาร (+9 more)

### Community 17 - "Database Design"
Cohesion: 0.18
Nodes (11): 5.10 Login History Table, 5.1 Entity Overview, 5.2 Recommended Tables, 5.3 Profiles Table, 5.4 Training Records Table, 5.5 Certificates Table, 5.6 Development Analysis Table, 5.7 Departments Table (+3 more)

### Community 18 - "TypeScript Configuration"
Cohesion: 0.18
Nodes (10): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, noEmit, skipLibCheck, strict (+2 more)

### Community 19 - "Development Phases"
Cohesion: 0.22
Nodes (9): 19. Development Phases, Phase 0: Setup Supabase + Database Schema, Phase 1: Authentication + RBAC, Phase 2: Dashboard + Search + Filter, Phase 3: Individual Profile, Phase 4: Self-Service Form, Phase 5: Analytics + Reports, Phase 6: Audit Logs + Advanced Security (+1 more)

### Community 20 - "Output Dashboard"
Cohesion: 0.22
Nodes (9): 4.29 เป้าหมายของ Output, 4.30 Executive Dashboard, 4.31 Individual Personnel Dashboard, 4.32 Analytics Dashboard, 4.33 Data Table, 4.34 Self-Service Form, 4.35 Reports, 4.36 Security Output (+1 more)

### Community 21 - "Application Pages"
Cohesion: 0.22
Nodes (9): 9.1 Login / Register, 9.2 Executive Dashboard, 9.3 Analytics Dashboard, 9.4 Training Records, 9.5 Individual Profile, 9.6 Self-Service Form, 9.7 Reports, 9.8 Admin & Security (+1 more)

### Community 22 - "Supabase Setup"
Cohesion: 0.33
Nodes (5): Getting Started, Phase 1 Supabase Setup, PTDMS, Stack, Supabase

### Community 23 - "Data Cleanup"
Cohesion: 0.33
Nodes (4): env, key, supabase, url

### Community 24 - "Security Controls"
Cohesion: 0.40
Nodes (5): 15.1 OWASP-Aligned Controls, 15.2 Frontend Security, 15.3 Database Security, 15.4 Operational Security, 15. Security Requirements

### Community 25 - "Testing Plan"
Cohesion: 0.40
Nodes (5): 20.1 Functional Testing, 20.2 Security Testing, 20.3 Responsive Testing, 20.4 Production Testing, 20. Testing Plan

### Community 26 - "Deployment Strategy"
Cohesion: 0.40
Nodes (5): 21.1 GitHub, 21.2 Supabase, 21.3 Vercel, 21.4 Production Checklist, 21. Deployment Plan

### Community 27 - "Validation Stack"
Cohesion: 0.50
Nodes (4): 10.1 Validation Stack, 10.2 Training Form Validation, 10.3 Security Validation, 10. Form Validation & Data Validation

### Community 28 - "Search & Analytics"
Cohesion: 0.50
Nodes (4): 11.1 Search, 11.2 Filter, 11.3 Analytics Calculation, 11. Search, Filter & Analytics Logic

### Community 29 - "Reporting & Export"
Cohesion: 0.50
Nodes (4): 12.1 Report Types, 12.2 Export Formats, 12.3 Export Security, 12. Reporting & Export

### Community 30 - "Project Overview"
Cohesion: 0.50
Nodes (4): 1.1 วัตถุประสงค์, 1.2 เป้าหมายหลัก, 1.3 แนวคิดหลักของระบบ, 1. ภาพรวมโครงการ

### Community 31 - "Enterprise Architecture"
Cohesion: 0.50
Nodes (4): 3.1 High-Level Architecture, 3.2 Architecture Principles, 3.3 Deployment Architecture, 3. Enterprise Architecture

### Community 32 - "Row Level Security Strategy"
Cohesion: 0.50
Nodes (4): 7.1 RLS Principles, 7.2 RLS Policy Summary, 7.3 ตัวอย่างแนวคิด Policy, 7. Row Level Security Strategy

### Community 33 - "Authentication & Session Management"
Cohesion: 0.50
Nodes (4): 8.1 Required Auth Features, 8.2 Production Auth Rules, 8.3 Route Protection, 8. Authentication & Session Management

### Community 35 - "Graphify Documentation"
Cohesion: 0.09
Nodes (22): Admin และ Security, Auth, Router, Layout, Shared UI, Authentication และ Authorization, Core Bridge Nodes, Dashboard, Analytics, Courses, Recommendations, Development Rules for AI, Documentation Communities, Feature Communities (+14 more)

### Community 36 - "Responsive Design Guidelines"
Cohesion: 0.67
Nodes (3): 16.1 Breakpoints, 16.2 UX Guidelines, 16. Responsive Design Requirements

### Community 37 - "Frontend Environment Variables"
Cohesion: 0.67
Nodes (3): 18.1 Frontend Environment, 18.2 Important Rule, 18. Environment Variables

### Community 38 - "SPD Service Overview"
Cohesion: 0.06
Nodes (30): Admin, Dashboard, Digital Service, Information System Support, Integration Requirements, IT Support, Objectives, Overview (+22 more)

### Community 46 - "Spd Service Management"
Cohesion: 0.11
Nodes (13): deleteSpdServiceTicket(), getSpdServiceDashboardData(), updateSpdServiceTicketWorkflow(), chartColors, CompleteTicketModalProps, DashboardStat(), formatDateTime(), openStatuses (+5 more)

### Community 47 - "Account Settings"
Cohesion: 0.25
Nodes (5): AccountSettingsPage(), educationOptions, employmentTypeOptions, ProfileFormState, SettingsTab

### Community 48 - "Spd Service Services"
Cohesion: 0.14
Nodes (16): CreateSpdServiceSatisfactionSurveyValues, CreateSpdServiceTicketValues, defaultSpdServiceTelegramMessageTemplate, getSpdServiceAdminRecipients(), getSpdServiceTelegramSettings(), parseAdminRecipientIds(), parseAdminUsernames(), saveSpdServiceTelegramSettings() (+8 more)

### Community 49 - "Spd Service Requests"
Cohesion: 0.13
Nodes (12): createSpdServiceSatisfactionSurvey(), getMySpdServiceSatisfactionSurveys(), getMySpdServiceTickets(), getSpdServiceTicketDetail(), SpdServiceTicketDetail, formatDateTime(), SatisfactionModalProps, SpdServiceMyRequestsPage() (+4 more)

### Community 50 - "Personnel Profile"
Cohesion: 0.18
Nodes (11): IndividualProfileViewProps, runSupabaseQuery(), listCourseDirectory(), currentFiscalYear, getPersonnelDetails(), listPersonnel(), updateOwnProfileDetails(), updatePersonnelProfile() (+3 more)

### Community 51 - "Database Types"
Cohesion: 0.15
Nodes (12): AuditLog, Department, ItAsset, ItAssetEvaluationSettings, LoginHistory, SiteContentDocument, SiteContentHistory, SiteContentStatus (+4 more)

### Community 52 - "General Utilities"
Cohesion: 0.18
Nodes (8): applyTemplate(), buildTicketCreatedMessage(), corsHeaders, defaultMessageTemplate, escapeHtml(), Profile, TelegramSetting, Ticket

### Community 53 - "Self Service Form"
Cohesion: 0.23
Nodes (10): SelfServiceRouteState, normalizeTrainingType(), optionalText, trainingFormSchema, TrainingFormValues, trainingTypeOptions, TrainingTypeValue, defaultValues (+2 more)

### Community 54 - "Supabase Queries"
Cohesion: 0.50
Nodes (4): AbortableSupabaseRequest, getErrorMessage(), SupabaseResult, toSupabaseError()

### Community 55 - "Gemini Integration"
Cohesion: 0.31
Nodes (9): callGemini(), cleanGeminiText(), getHeader(), handler(), isStrongMatch(), SearchResult, sendJson(), VercelRequest (+1 more)

### Community 56 - "Service Ticket Management"
Cohesion: 0.18
Nodes (8): getSpdServiceTickets(), SpdServiceTicketListPage(), statusLabels, statusOptions, statusTones, urgencyOptions, SpdServiceTicketStatus, SpdServiceUrgency

### Community 57 - "Thai Date Formatting"
Cohesion: 0.36
Nodes (7): formatThaiDate(), formatThaiLongDate(), getMonthFromISODate(), getThaiFiscalYearFromISODate(), ISODateParts, parseISODateAsUTC(), parseISODateParts()

### Community 58 - "Service Request Management"
Cohesion: 0.22
Nodes (8): createSpdServiceTicket(), getSpdServiceCategories(), notifySpdServiceTicketCreated(), SpdServiceRequestPage(), subjectOptions, urgencyOptions, SpdServiceCategory, SpdServiceTicket

### Community 59 - "Development Overview"
Cohesion: 0.33
Nodes (5): Current Entry Points, Development Sequence, Scope, Separation Rule, SPD Service Management System

### Community 60 - "Migration & Ownership"
Cohesion: 0.33
Nodes (5): Guardrails, Implementation Order, Supabase Migration, Table Ownership, SPD Service Management System

### Community 61 - "Project Links"
Cohesion: 0.40
Nodes (4): name, organization_id, organization_slug, ref

### Community 64 - "Authentication Schemas"
Cohesion: 0.18
Nodes (14): ForgotPasswordFormValues, forgotPasswordSchema, LoginFormValues, loginSchema, RegisterFormValues, registerSchema, ResetPasswordFormValues, resetPasswordSchema (+6 more)

### Community 65 - "Course Directory"
Cohesion: 0.17
Nodes (12): CourseListPage(), CourseAggregation, CourseCategoryRow, CourseDirectoryAttendee, CourseDirectoryCourse, CourseDirectoryData, CourseDirectorySection, CourseProfile (+4 more)

### Community 66 - "Protected Routes"
Cohesion: 0.20
Nodes (11): ProtectedRoute(), ProtectedRouteProps, adminSystems, assetSystems, coreSystems, PortalCard, PortalPage(), serviceSystems (+3 more)

### Community 67 - "SPD Design System"
Cohesion: 0.14
Nodes (13): Button Standard, Card Standard, Design Concept, Disease Control Strategic Planning Portal, Modern Dashboard Theme (Recommended), Section 1, Section 2, Section 3 (+5 more)

### Community 68 - "App Layout"
Cohesion: 0.29
Nodes (8): AppLayout(), NavItem, navItems, CalendarLayout(), roleLabels, ConfirmModal(), ConfirmModalProps, cn()

### Community 69 - "Design Identity"
Cohesion: 0.29
Nodes (7): Background, Border, Color Identity, Hover, Primary, Secondary, แผนระดับต่าง ๆ

### Community 70 - "Disease Control Plan"
Cohesion: 0.29
Nodes (7): Background, Border, Color Identity, Hover, Primary, Secondary, แผนงานด้านการป้องกันควบคุมโรคและภัยสุขภาพ

### Community 71 - "Annual Work Plan"
Cohesion: 0.29
Nodes (7): Background, Border, Color Identity, Hover, Primary, Secondary, แนวทางดำเนินงานประจำปี

### Community 72 - "Risk Management Strategy"
Cohesion: 0.29
Nodes (7): Background, Border, Color Identity, Hover, Primary, Secondary, แผนบริหารความเสี่ยงยุทธศาสตร์

### Community 73 - "Policy Management"
Cohesion: 0.29
Nodes (7): Background, Border, Color Identity, Hover, Primary, Secondary, นโยบายผู้บริหาร

### Community 74 - "SpdAssistant Integration"
Cohesion: 0.40
Nodes (3): useSpdAssistantContext(), ChatMessage, SpdAssistantWidget()

### Community 75 - "UI Typography"
Cohesion: 0.50
Nodes (4): Card Content, Header, Section Title, Typography Recommendation

### Community 76 - "Color Palette"
Cohesion: 0.67
Nodes (3): Global Colors, Main Blue, Main Green

## Knowledge Gaps
- **474 isolated node(s):** `VercelRequest`, `VercelResponse`, `SearchResult`, `name`, `private` (+469 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuthStore` connect `User Authentication` to `Authentication Schemas`, `User Management Forms`, `Protected Routes`, `App Layout`, `Strategy Calendar`, `IT Asset Management`, `SpdAssistant Integration`, `Personnel Management`, `Account Settings`, `Spd Service Management`, `Spd Service Requests`, `Personnel Profile`, `Spd Service Services`, `Meeting Room Booking`, `Self Service Form`, `Service Request Management`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `supabase` connect `Security and Analytics` to `Authentication Schemas`, `Course Directory`, `User Management Forms`, `Recommendations Engine`, `Strategy Calendar`, `Training Records`, `IT Asset Management`, `Site Manager UI`, `Personnel Management`, `Meeting Room Booking`, `Spd Service Services`, `Personnel Profile`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `PageHeader()` connect `Personnel Management` to `Course Directory`, `User Management Forms`, `Recommendations Engine`, `Training Records`, `Security and Analytics`, `Strategy Calendar`, `Dashboard Operations`, `Site Manager UI`, `Account Settings`, `Meeting Room Booking`, `Personnel Profile`, `Self Service Form`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `VercelRequest`, `VercelResponse`, `SearchResult` to the rest of the system?**
  _474 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `User Management Forms` be split into smaller, more focused modules?**
  _Cohesion score 0.12987012987012986 - nodes in this community are weakly interconnected._
- **Should `Recommendations Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `Strategy Calendar` be split into smaller, more focused modules?**
  _Cohesion score 0.07073170731707316 - nodes in this community are weakly interconnected._