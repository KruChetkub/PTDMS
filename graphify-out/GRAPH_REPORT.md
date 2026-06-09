# Graph Report - C:\Users\piche\Documents\PTDMS  (2026-06-08)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 645 nodes · 1026 edges · 46 communities (41 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]

## God Nodes (most connected - your core abstractions)
1. `useAuthStore` - 37 edges
2. `แผนพัฒนาระบบ PTDMS` - 29 edges
3. `P - Process` - 18 edges
4. `compilerOptions` - 17 edges
5. `PTDMS AI Development Tracker & Handoff` - 17 edges
6. `runSupabaseQuery()` - 16 edges
7. `PageHeader()` - 14 edges
8. `supabase` - 14 edges
9. `I - Input` - 12 edges
10. `7. ลำดับการพัฒนาที่แนะนำ` - 11 edges

## Surprising Connections (you probably didn't know these)
- `RegisterPage()` --calls--> `useAuthStore`  [EXTRACTED]
  src/features/auth/pages/RegisterPage.tsx → src/stores/auth.store.ts
- `listCourseAttendees()` --calls--> `runSupabaseQuery()`  [EXTRACTED]
  src/services/course.service.ts → src/lib/supabase-query.ts
- `listCourseDirectory()` --calls--> `runSupabaseQuery()`  [EXTRACTED]
  src/services/course.service.ts → src/lib/supabase-query.ts
- `GuestRoute()` --calls--> `useAuthStore`  [EXTRACTED]
  src/components/auth/GuestRoute.tsx → src/stores/auth.store.ts
- `ProtectedRoute()` --calls--> `useAuthStore`  [EXTRACTED]
  src/components/auth/ProtectedRoute.tsx → src/stores/auth.store.ts

## Import Cycles
- None detected.

## Communities (46 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (51): UserManagementPage(), router, ForgotPasswordFormValues, forgotPasswordSchema, LoginFormValues, loginSchema, RegisterFormValues, registerSchema (+43 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (47): IndividualProfileViewProps, AbortableSupabaseRequest, getErrorMessage(), runSupabaseQuery(), SupabaseResult, toSupabaseError(), ReportsPage(), SelfServiceRouteState (+39 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (30): SecurityPage(), CreateFormState, createRoleOptions, EditFormState, educationOptions, employmentTypeOptions, formatISOToThaiDate(), genderLabels (+22 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (30): formatDateTime(), priorityLabels, priorityStyles, RecommendationsPage(), buildCourseCandidates(), buildCourseRecommendations(), buildExecutiveInsights(), buildReason() (+22 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (28): cancelStrategyEvent(), createStrategyEvent(), listStrategyEvents(), restoreStrategyEvent(), StrategyEventForm, StrategyEventRow, toEventInsert(), updateStrategyEvent() (+20 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (23): AnalyticsPage(), buildChartSvg(), COLORS, copyComputedStyles(), escapeSvgText(), ExportDetail, ExportKey, ImageFormat (+15 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (31): 10. Commands Run, 11. Work Log, 12. Known Issues / Blockers, 13. Decisions Log, 14. Next Recommended Actions, 15. AI Handoff Template, 16. Minimal Context สำหรับ AI รอบถัดไป, 1. เป้าหมายของไฟล์นี้ (+23 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (29): dependencies, clsx, @hookform/resolvers, lucide-react, react, react-dom, react-hook-form, react-router-dom (+21 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (22): CourseListPage(), buildElementSvg(), copyComputedStyles(), DashboardPage(), emptySummary, escapeSvgText(), ExportDetail, ExportKey (+14 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (24): 1. ฟีเจอร์ที่เพิ่ม/แก้ไข (Key Features), 1. ฟีเจอร์ที่เพิ่ม/แก้ไข (Key Features), 1. ฟีเจอร์ที่เพิ่ม/แก้ไข (Key Features), 2. การตรวจสอบ (Verification), 2. สิ่งที่ต้องทำต่อ (Next Steps), 2. สิ่งที่ต้องทำใน Supabase (Database Setup), 3. ขั้นตอนถัดไป (Next Steps), 3. สิ่งที่ต้องทำต่อ (Next Steps) (+16 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+10 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (18): 4.12 เป้าหมายของ Process, 4.13 Frontend Stack, 4.14 Backend & Database, 4.15 Hosting & Deployment, 4.16 Responsive Design Requirements, 4.17 Authentication Flow, 4.18 Security Architecture, 4.19 Role-Based Access Control (+10 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (17): 4.10 วิธีนำเข้าข้อมูล, 4.11 Security Input Validation, 4.1 เป้าหมายของ Input, 4.2 ข้อมูลผู้ใช้งานระบบ: Users, 4.3 ข้อมูลโปรไฟล์บุคลากร: Profiles, 4.4 ระดับผู้ใช้งาน: RBAC Roles, 4.5 ข้อมูลการอบรม: Training Records, 4.6 ข้อมูลใบประกาศ: Certificates (+9 more)

### Community 13 - "Community 13"
Cohesion: 0.12
Nodes (16): 1. Course Directory, 2. Self-Service Field Alignment, 3. Training Records Table, 4. Executive Dashboard, Current State, Files Changed Today, Git Commands (Ready to Use), Handoff (+8 more)

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (13): 1.1 I - Input (ข้อมูลและส่วนประกอบขาเข้า), 1.2 P - Process (กระบวนการทำงาน), 1.3 O - Output (ผลลัพธ์และการแสดงผล), 1. IPO Framework: Centralized SSO, 2. แผนดำเนินการ (Implementation Track), 3. Security และ Governance, 4. Acceptance Criteria, 5. ไฟล์อ้างอิงในระบบจริง (+5 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (12): 1) Analytics & Insights, 2) Executive Dashboard, 3) Recommendations, 4) Super Admin Exclusion (Analytics/Dashboard), 5) Course Directory, Files Touched (Today), Next Suggested Actions, Open Notes (+4 more)

### Community 16 - "Community 16"
Cohesion: 0.17
Nodes (11): 13.1 Storage Buckets, 13.2 Storage Security, 13. Supabase Storage, 17. Suggested Project Structure, 23. Acceptance Criteria, 24. Future Enhancement, 25. สรุป, 2. Technology Stack (+3 more)

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (11): 5.10 Login History Table, 5.1 Entity Overview, 5.2 Recommended Tables, 5.3 Profiles Table, 5.4 Training Records Table, 5.5 Certificates Table, 5.6 Development Analysis Table, 5.7 Departments Table (+3 more)

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (10): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, noEmit, skipLibCheck, strict (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.22
Nodes (9): 19. Development Phases, Phase 0: Setup Supabase + Database Schema, Phase 1: Authentication + RBAC, Phase 2: Dashboard + Search + Filter, Phase 3: Individual Profile, Phase 4: Self-Service Form, Phase 5: Analytics + Reports, Phase 6: Audit Logs + Advanced Security (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.22
Nodes (9): 4.29 เป้าหมายของ Output, 4.30 Executive Dashboard, 4.31 Individual Personnel Dashboard, 4.32 Analytics Dashboard, 4.33 Data Table, 4.34 Self-Service Form, 4.35 Reports, 4.36 Security Output (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.22
Nodes (9): 9.1 Login / Register, 9.2 Executive Dashboard, 9.3 Analytics Dashboard, 9.4 Training Records, 9.5 Individual Profile, 9.6 Self-Service Form, 9.7 Reports, 9.8 Admin & Security (+1 more)

### Community 22 - "Community 22"
Cohesion: 0.33
Nodes (5): Getting Started, Phase 1 Supabase Setup, PTDMS, Stack, Supabase

### Community 23 - "Community 23"
Cohesion: 0.33
Nodes (4): env, key, supabase, url

### Community 24 - "Community 24"
Cohesion: 0.40
Nodes (5): 15.1 OWASP-Aligned Controls, 15.2 Frontend Security, 15.3 Database Security, 15.4 Operational Security, 15. Security Requirements

### Community 25 - "Community 25"
Cohesion: 0.40
Nodes (5): 20.1 Functional Testing, 20.2 Security Testing, 20.3 Responsive Testing, 20.4 Production Testing, 20. Testing Plan

### Community 26 - "Community 26"
Cohesion: 0.40
Nodes (5): 21.1 GitHub, 21.2 Supabase, 21.3 Vercel, 21.4 Production Checklist, 21. Deployment Plan

### Community 27 - "Community 27"
Cohesion: 0.50
Nodes (4): 10.1 Validation Stack, 10.2 Training Form Validation, 10.3 Security Validation, 10. Form Validation & Data Validation

### Community 28 - "Community 28"
Cohesion: 0.50
Nodes (4): 11.1 Search, 11.2 Filter, 11.3 Analytics Calculation, 11. Search, Filter & Analytics Logic

### Community 29 - "Community 29"
Cohesion: 0.50
Nodes (4): 12.1 Report Types, 12.2 Export Formats, 12.3 Export Security, 12. Reporting & Export

### Community 30 - "Community 30"
Cohesion: 0.50
Nodes (4): 1.1 วัตถุประสงค์, 1.2 เป้าหมายหลัก, 1.3 แนวคิดหลักของระบบ, 1. ภาพรวมโครงการ

### Community 31 - "Community 31"
Cohesion: 0.50
Nodes (4): 3.1 High-Level Architecture, 3.2 Architecture Principles, 3.3 Deployment Architecture, 3. Enterprise Architecture

### Community 32 - "Community 32"
Cohesion: 0.50
Nodes (4): 7.1 RLS Principles, 7.2 RLS Policy Summary, 7.3 ตัวอย่างแนวคิด Policy, 7. Row Level Security Strategy

### Community 33 - "Community 33"
Cohesion: 0.50
Nodes (4): 8.1 Required Auth Features, 8.2 Production Auth Rules, 8.3 Route Protection, 8. Authentication & Session Management

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (3): 14.1 Events ที่ต้องเก็บ, 14.2 Audit Log Metadata, 14. Audit Logging

### Community 36 - "Community 36"
Cohesion: 0.67
Nodes (3): 16.1 Breakpoints, 16.2 UX Guidelines, 16. Responsive Design Requirements

### Community 37 - "Community 37"
Cohesion: 0.67
Nodes (3): 18.1 Frontend Environment, 18.2 Important Rule, 18. Environment Variables

### Community 38 - "Community 38"
Cohesion: 0.67
Nodes (3): 22.1 เอกสาร, 22.2 ระบบ, 22. Deliverables

## Knowledge Gaps
- **342 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+337 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `แผนพัฒนาระบบ PTDMS` connect `Community 16` to `Community 11`, `Community 12`, `Community 17`, `Community 19`, `Community 20`, `Community 21`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 35`, `Community 36`, `Community 37`, `Community 38`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `supabase` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 8`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `useAuthStore` connect `Community 0` to `Community 1`, `Community 2`, `Community 4`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _342 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06288448393711552 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07146087743102668 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07549361207897794 - nodes in this community are weakly interconnected._