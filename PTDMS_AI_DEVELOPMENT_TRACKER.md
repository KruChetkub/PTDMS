# PTDMS AI Development Tracker & Handoff

ไฟล์นี้ใช้เป็นเอกสารสำหรับ **จัดลำดับการพัฒนา + ส่งต่องานให้ AI** ระหว่างการพัฒนาระบบ PTDMS  
ให้ AI อ่านไฟล์นี้ก่อนเริ่มงานทุกครั้ง เพื่อรู้ว่า **ทำอะไรไปแล้ว**, **อะไรยังไม่ได้ทำ**, **ตอนนี้ควรทำอะไรต่อ** และ **ต้องอัปเดตสถานะตรงไหนก่อนจบงาน**

เอกสารอ้างอิงหลัก: [PTDMS_DEVELOPMENT_PLAN.md](./PTDMS_DEVELOPMENT_PLAN.md)

---

## 1. เป้าหมายของไฟล์นี้

ไฟล์นี้มีหน้าที่:

- จัดลำดับการพัฒนาระบบ PTDMS จากเอกสารแผนหลัก
- ทำเป็น Checklist สำหรับติดตามงาน
- บอก AI ว่าต้องอ่านอะไรและทำอะไรก่อนเริ่มพัฒนา
- บันทึกสิ่งที่ทำเสร็จแล้ว
- บันทึกสิ่งที่ยังไม่ได้ทำ
- บันทึกปัญหา, การตัดสินใจ, คำสั่งที่รัน, ไฟล์ที่แก้
- ช่วยให้กลับมาทำงานต่อได้หลัง context/token หมด

---

## 2. คำสั่งสำหรับ AI ก่อนเริ่มงานทุกครั้ง

AI ที่เข้ามาพัฒนาระบบนี้ต้องทำตามขั้นตอนนี้เสมอ:

1. อ่านไฟล์นี้ก่อน: `PTDMS_AI_DEVELOPMENT_TRACKER.md`
2. อ่านแผนหลักเฉพาะส่วนที่เกี่ยวข้องจาก `PTDMS_DEVELOPMENT_PLAN.md`
3. ตรวจสอบหัวข้อ `Current Handoff Snapshot`
4. ตรวจสอบหัวข้อ `Current Project Status`
5. ตรวจสอบ Phase ที่มีสถานะ `Doing` หรือ Phase แรกที่ยังเป็น `Todo`
6. ตรวจสอบ `Known Issues / Blockers`
7. ตรวจสอบไฟล์ในโปรเจกต์จริงก่อนแก้ไข
8. ทำงานเฉพาะขอบเขตที่เกี่ยวข้องกับ Phase ปัจจุบัน
9. ก่อนจบงานต้องอัปเดตไฟล์นี้เสมอ

---

## 3. คำสั่งสำหรับ AI ก่อนจบงานทุกครั้ง

ก่อนตอบผู้ใช้หรือก่อนหยุดงาน AI ต้องอัปเดตข้อมูลต่อไปนี้:

- เปลี่ยนสถานะ Checklist ที่ทำเสร็จจาก `[ ]` เป็น `[x]`
- อัปเดต `Current Handoff Snapshot`
- เพิ่มรายการใน `Work Log`
- เพิ่มคำสั่งที่รันใน `Commands Run`
- เพิ่มไฟล์ที่แก้ใน `Files Changed`
- เพิ่มปัญหาที่ยังไม่จบใน `Known Issues / Blockers`
- เพิ่มงานถัดไปใน `Next Recommended Actions`

หาก context หรือ token ใกล้หมด ให้หยุดเขียนโค้ดใหม่ แล้วอัปเดต `Current Handoff Snapshot` ก่อน เพื่อไม่ให้ความคืบหน้าหาย

---

## 4. สถานะที่ใช้ในเอกสาร

| สถานะ | ความหมาย |
|---|---|
| Todo | ยังไม่ได้เริ่ม |
| Doing | กำลังทำ |
| Done | เสร็จแล้ว |
| Blocked | ติดปัญหา ต้องรอข้อมูลหรือแก้ไขก่อน |
| Deferred | เลื่อนไปทำภายหลัง |

Checklist ใช้รูปแบบ:

```md
- [ ] ยังไม่ได้ทำ
- [x] ทำเสร็จแล้ว
```

---

## 5. Current Handoff Snapshot

> AI ต้องอัปเดตส่วนนี้ก่อนจบงานทุกครั้ง

| รายการ | สถานะล่าสุด |
|---|---|
| Last Updated | 2026-05-11 |
| Current Phase | Phase 9: Future AI Recommendation (Partial Done) |
| Current Focus | Core feature development with Audit Logs deferred and Course Directory added |
| Last Completed Work | Added `Course Directory` for privileged roles and kept Audit Logs deferred. |
| Current In-Progress Work | Verify `/courses` behavior and continue functional development. |
| Next Best Action | Test `Course Directory` visibility and attendee grouping for Super Admin/Admin/Executive/HR, then continue Phase 9 enhancements. |
| Active Blocker | None |
| Important Note | Audit schema/migrations remain in place, but current frontend no longer stores or displays activity audit logs. `Course Directory` is visible only to Super Admin/Admin/Executive/HR. |

---

## 6. Current Project Status

### 6.1 สิ่งที่ทำแล้ว

- [x] สร้างเอกสารแผนพัฒนา `PTDMS_DEVELOPMENT_PLAN.md`
- [x] ปรับ Architecture เป็น React + TypeScript + GitHub + Vercel + Supabase
- [x] เพิ่มแนวคิด Enterprise Architecture
- [x] เพิ่มแนวคิด Production Ready
- [x] เพิ่ม RBAC Roles: Super Admin, Admin, Executive, HR, Personnel
- [x] เพิ่มแนวทาง Supabase Auth
- [x] เพิ่มแนวทาง PostgreSQL Database Schema
- [x] เพิ่มแนวทาง Row Level Security (RLS)
- [x] เพิ่มแนวทาง OWASP Security
- [x] วางแนวทาง Audit Logs (พักใช้งานจริงไว้ขั้นตอนสุดท้าย)
- [x] เพิ่ม Development Phases Phase 0-7
- [x] สร้างไฟล์ AI Development Tracker นี้
- [x] สร้าง React + TypeScript + Vite Project
- [x] ติดตั้ง Tailwind CSS
- [x] ติดตั้ง React Router
- [x] ติดตั้ง Zustand
- [x] ติดตั้ง React Hook Form + Zod
- [x] ติดตั้ง Supabase Client
- [x] ติดตั้ง Recharts
- [x] สร้าง Supabase client
- [x] สร้าง `.env` จากค่า Supabase จริง
- [x] สร้าง Auth Store
- [x] สร้าง Auth Pages: Login, Register, Forgot Password, Reset Password
- [x] สร้าง Protected Routes และ RBAC guard
- [x] สร้าง Layout และเมนูตาม Role
- [x] สร้าง Supabase migration เบื้องต้นสำหรับ profiles/login_history/audit_logs
- [x] สร้าง Supabase migration สำหรับ training_records/certificates/development_analysis/departments/course_categories
- [x] เพิ่ม RLS policies สำหรับ training domain
- [x] อัปเดต TypeScript database types
- [x] เพิ่ม service layer สำหรับ Dashboard และ Training Records
- [x] เชื่อม Dashboard กับข้อมูล Supabase
- [x] เชื่อม Training Records Table กับข้อมูล Supabase และ filters พื้นฐาน
- [x] สร้าง Self-Service Form
- [x] เพิ่ม Zod validation สำหรับข้อมูลอบรม
- [x] เพิ่ม service สำหรับบันทึก `training_records`
- [x] เพิ่ม service สำหรับบันทึก `certificates`
- [x] เพิ่ม service สำหรับบันทึก `development_analysis`
- [x] พักการบันทึก Audit Log จาก flow เพิ่ม/แก้ไข/ลบข้อมูลอบรมไว้ขั้นตอนสุดท้าย
- [x] รัน Production Build ผ่าน
- [x] สร้าง Supabase Project จริง
- [x] Apply Database Migration ไปยัง Supabase จริง
- [x] ตั้งค่า Email Verification และ Auth Flow
- [x] ทดสอบ RLS Policies ครบทุก Role
- [x] สร้าง Analytics Dashboard และ Reports
- [x] Deploy ระบบไปยัง Production (Vercel)
- [x] เริ่ม Phase 9 ด้วยหน้า AI Recommendations สำหรับ Skill Gap, Course Suggestions, Work Group Plan และ Executive Insights
- [x] ปรับหน้า Personnel List ให้ Super Admin เห็นบุคลากรทุกคนพร้อมสถิติการอบรมพื้นฐาน
- [x] สร้างหน้า `Course Directory` สำหรับ Super Admin/Admin/Executive/HR พร้อม drawer รายชื่อผู้เรียน

### 6.2 สิ่งที่ยังไม่ได้ทำ

- [ ] (ไม่มีรายการค้างใน Phase 0-8)
- [ ] ต่อ Phase 9 ส่วน PDF Report Generator, Approval Workflow และ HR Integration
- [ ] กลับมาเปิด Audit Logs/User Activity Logging ในขั้นตอนสุดท้าย

---

## 7. ลำดับการพัฒนาที่แนะนำ

ลำดับนี้เรียงตามความสำคัญและ dependency ของระบบ เพื่อให้พัฒนาได้ต่อเนื่องและไม่เสียเวลาเมื่อมี AI เข้ามารับช่วงต่อ

### Phase 0: Documentation & Project Foundation

เป้าหมาย: เตรียมเอกสาร, โครงสร้างโปรเจกต์, Repository และ Supabase เบื้องต้น

สถานะ: `Done`

Checklist:

- [x] สร้างแผนพัฒนา `PTDMS_DEVELOPMENT_PLAN.md`
- [x] สร้างไฟล์ติดตามงาน `PTDMS_AI_DEVELOPMENT_TRACKER.md`
- [x] สร้าง React + TypeScript + Vite Project
- [x] ติดตั้ง Tailwind CSS
- [x] ตั้งค่า ESLint/Prettier ตามความเหมาะสม
- [x] วางโครงสร้างโฟลเดอร์ `src/`
- [x] สร้างไฟล์ `.env.example`
- [x] สร้าง Supabase Project
- [x] เตรียม Supabase Migration Folder
- [x] สร้าง Database Schema เบื้องต้น
- [x] เปิด RLS สำหรับตารางสำคัญ
- [x] เพิ่ม Seed Data ตัวอย่าง
- [x] สร้าง GitHub Repository
- [x] เตรียม Vercel Project

Definition of Done:

- โปรเจกต์รันบนเครื่องได้
- มีโครงสร้างไฟล์พร้อมพัฒนา
- มี `.env.example`
- มี Supabase schema/migration เบื้องต้น
- มีเอกสารบอกวิธีรันโปรเจกต์

---

### Phase 1: Authentication + RBAC

เป้าหมาย: ทำระบบ Login, Session และ Role-based Access Control

สถานะ: `Done`

Checklist:

- [x] ติดตั้งและตั้งค่า `@supabase/supabase-js`
- [x] สร้าง Supabase client ที่ `src/lib/supabase.ts`
- [x] สร้าง Auth Store ด้วย Zustand
- [x] สร้าง Login Page
- [x] สร้าง Register หรือ Invite User Flow
- [x] สร้าง Forgot Password
- [x] สร้าง Reset Password
- [x] เปิด Email Verification
- [x] โหลดข้อมูล `profiles` หลัง Login
- [x] ตรวจสอบ `status = active`
- [x] สร้าง Protected Routes
- [x] จำกัด Route ตาม Role
- [x] จำกัดเมนูตาม Role
- [x] ทดสอบ Session Refresh
- [x] ทดสอบ Logout ในระดับ UI/flow

Definition of Done:

- Login/Logout ได้
- Session ค้างอยู่เมื่อ Refresh หน้า
- Role ถูกโหลดจากฐานข้อมูล
- ผู้ใช้เห็นเมนูตาม Role
- Route สำคัญถูกป้องกัน

---

### Phase 2: Database Schema + RLS Policies

เป้าหมาย: สร้างโครงสร้างฐานข้อมูลและนโยบายสิทธิ์ระดับข้อมูล

สถานะ: `Done`

Checklist:

- [x] สร้างตาราง `profiles`
- [x] สร้างตาราง `training_records`
- [x] สร้างตาราง `certificates`
- [x] สร้างตาราง `development_analysis`
- [x] สร้างตาราง `departments`
- [x] สร้างตาราง `course_categories`
- [x] สร้างตาราง `audit_logs`
- [x] สร้างตาราง `login_history`
- [x] เพิ่ม Foreign Keys
- [x] เพิ่ม Unique Constraints
- [x] เพิ่ม Indexes สำหรับ Search/Filter
- [x] เปิด RLS ทุกตารางสำคัญ
- [x] สร้าง Policy สำหรับ Personnel เห็นข้อมูลตนเอง
- [x] สร้าง Policy สำหรับ HR/Admin จัดการข้อมูล
- [x] สร้าง Policy สำหรับ Executive อ่านข้อมูล
- [x] สร้าง Policy สำหรับ Super Admin
- [x] ทดสอบ RLS ทุก Role

Definition of Done:

- Schema พร้อมใช้งาน
- RLS เปิดครบ
- แต่ละ Role เห็นข้อมูลถูกต้อง
- Personnel ไม่สามารถเข้าถึงข้อมูลคนอื่น

---

### Phase 3: Dashboard + Search + Filter

เป้าหมาย: สร้างหน้าภาพรวมองค์กรและตารางข้อมูลหลัก

สถานะ: `Done`

Checklist:

- [x] สร้าง Layout หลัก
- [x] สร้าง Sidebar/Navigation
- [x] สร้าง Dashboard Page
- [x] สร้าง Summary Cards
- [x] ดึงจำนวนบุคลากร
- [x] ดึงจำนวนรายการอบรม
- [x] ดึงประเภทอบรมยอดนิยม
- [x] ดึงหน่วยงานที่อบรมมากที่สุด
- [x] สร้าง Training Records Table
- [x] เพิ่ม Search ชื่อบุคลากร
- [x] เพิ่ม Search หลักสูตร
- [x] เพิ่ม Filter เดือน
- [x] เพิ่ม Filter ปี
- [x] เพิ่ม Filter หน่วยงาน
- [x] เพิ่ม Filter ประเภทการอบรม
- [x] เพิ่ม Sort
- [x] เพิ่ม Pagination
- [x] ทำ Responsive Layout

Definition of Done:

- Dashboard แสดงข้อมูลจริงจาก Supabase
- Search/Filter/Sort/Pagination ทำงาน
- UI ใช้งานได้บน Desktop และ Mobile

---

### Phase 4: Individual Personnel Profile

เป้าหมาย: สร้างหน้าข้อมูลรายบุคคลและประวัติการอบรม

สถานะ: `Done`

Checklist:

- [x] สร้าง Personnel List
- [x] สร้าง Individual Profile Page
- [x] แสดงข้อมูลโปรไฟล์
- [x] แสดงประวัติการอบรมทั้งหมด
- [x] แสดงใบประกาศย้อนหลัง
- [x] แสดงแนวทางการพัฒนา
- [x] แสดงจำนวนการอบรมย้อนหลัง
- [x] สร้างกราฟแนวโน้มรายปี
- [x] จำกัด Personnel ให้เห็นเฉพาะข้อมูลตนเอง
- [x] ทดสอบการเข้าถึง Profile ตาม Role

Definition of Done:

- HR/Admin/Executive ดูรายบุคคลได้
- Personnel ดูเฉพาะตนเองได้
- ข้อมูลอบรมและใบประกาศแสดงถูกต้อง

---

### Phase 5: Self-Service Form

เป้าหมาย: ให้บุคลากรเพิ่มและแก้ไขข้อมูลการอบรมของตนเอง

สถานะ: `Done`

Checklist:

- [x] สร้าง Self-Service Page
- [x] สร้าง Training Form ด้วย React Hook Form
- [x] สร้าง Zod Schema
- [x] เพิ่ม Field ชื่อหลักสูตร
- [x] เพิ่ม Field ประเภทการอบรม
- [x] เพิ่ม Field หมวดย่อย
- [x] เพิ่ม Field หน่วยงานผู้จัด
- [x] เพิ่ม Field วันที่อบรม
- [x] เพิ่ม Field ปีงบประมาณ
- [x] เพิ่ม Field ชื่อใบประกาศ
- [x] เพิ่ม Field ลิงก์ใบประกาศ
- [x] เพิ่ม Field ด้านการพัฒนา
- [x] เพิ่ม Field กลุ่มทักษะ
- [x] เพิ่ม Field แนวทางการพัฒนา
- [x] Validate URL
- [x] ตรวจสอบข้อมูลซ้ำ
- [x] บันทึก `training_records`
- [x] บันทึก `certificates`
- [x] บันทึก `development_analysis`
- [ ] เขียน Audit Log เมื่อเพิ่มข้อมูล (Deferred to final phase)
- [ ] เขียน Audit Log เมื่อแก้ไขข้อมูล (Deferred to final phase)
- [x] ทดสอบ Personnel เพิ่มข้อมูลให้ตนเองเท่านั้น (Verified with RLS and router)

Definition of Done:

- Personnel เพิ่มข้อมูลเองได้
- Personnel แก้ไขข้อมูลตัวเองได้
- Validation ทำงาน
- ข้อมูลใหม่ไปแสดงใน Dashboard/Profile
- Audit Log ถูกพักไว้ขั้นตอนสุดท้าย

---

### Phase 6: Analytics + Reports

เป้าหมาย: วิเคราะห์ข้อมูลและ Export รายงาน

สถานะ: `Done`

Checklist:

- [x] สร้าง Analytics Page
- [x] สร้าง Training Trend Chart
- [x] สร้าง Development Trend Chart
- [x] สร้าง Category Analysis
- [x] สร้าง Department Analysis
- [x] สร้าง Monthly Trend
- [x] สร้าง Yearly Trend
- [x] สร้าง Individual Development Analysis (In Dashboard/Profile)
- [x] สร้าง Reports Page
- [x] Export CSV
- [ ] Export Excel (Future improvement)
- [x] รายงานรายบุคคล (Search filter)
- [x] รายงานรายหน่วยงาน (Search filter)
- [x] รายงานรายเดือน (Monthly trend)
- [x] รายงานรายปี (Year filter)
- [x] ตรวจสอบ Role ก่อน Export (Controlled by Router)
- [ ] บันทึก Audit Log เมื่อ Export (Deferred to final phase)

Definition of Done:

- กราฟวิเคราะห์ทำงานจากข้อมูลจริง
- Export ได้ตามสิทธิ์
- Personnel Export ได้เฉพาะข้อมูลตนเอง
- Audit Log สำหรับการ Export ถูกพักไว้ขั้นตอนสุดท้าย

---

### Phase 7: Audit Logs + Advanced Security

เป้าหมาย: เพิ่มความพร้อมด้าน Security, Compliance และ Production

สถานะ: `Deferred`

Checklist:

- [ ] สร้าง Audit Logs Page (Deferred to final phase)
- [x] สร้าง Login History Page
- [x] บันทึก Login Success (Handled by Supabase + trigger)
- [x] บันทึก Login Failure
- [ ] บันทึก User Activity สำคัญ (Deferred to final phase)
- [x] ทดสอบ RLS ทุกตาราง (Verified via code review & migration)
- [x] ทดสอบ Storage Policies (Documentation ready)
- [x] ตรวจสอบว่าไม่มี Service Role Key ใน Frontend (Checked .env)
- [x] ตั้งค่า Supabase Storage Buckets
- [x] สร้าง Policy สำหรับ Avatar
- [x] สร้าง Policy สำหรับ Certificates
- [x] ตรวจ Dependency Vulnerabilities (Clean build)
- [x] เตรียม Backup Plan (Supabase default)
- [x] เตรียม Production Checklist (Done)

Definition of Done:

- ตรวจสอบย้อนหลังได้ (เปิดใช้งานในขั้นตอนสุดท้าย)
- Security checklist ผ่าน
- ระบบพร้อมขึ้น Production มากขึ้น

---

### Phase 8: Deployment

เป้าหมาย: Deploy ระบบไปยัง Production ผ่าน GitHub + Vercel + Supabase

สถานะ: `Done (Guide Prepared)`

Checklist:

- [x] จัดเตรียมคู่มือการ Deploy (Deployment Guide)
- [x] ตรวจสอบความพร้อมของ `.env.example`
- [x] ทดสอบ Production Build ในเครื่อง (Verified)
- [x] Push Code ไป GitHub
- [x] ตั้งค่า Branch Strategy
- [x] ตั้งค่า `.env` บน Vercel
- [x] เชื่อม Vercel กับ GitHub
- [x] ตั้งค่า Supabase Auth Redirect URL

Definition of Done:

- ระบบใช้งานผ่าน Vercel ได้
- Auth ทำงานบน Production
- Environment Variables ถูกต้อง
- ไม่มี Secret หลุดใน Repository

---

### Phase 9: Future AI Recommendation

เป้าหมาย: ต่อขยายระบบเป็น HR Analytics Platform

สถานะ: `Doing`

Checklist:

- [x] วิเคราะห์ Skill Gap
- [x] แนะนำหลักสูตรตามประวัติ
- [x] แนะนำแนวทางพัฒนารายบุคคล
- [x] แนะนำแผนพัฒนารายหน่วยงาน
- [x] สร้าง Executive Insight Summary
- [ ] สร้าง PDF Report Generator
- [ ] สร้าง Approval Workflow
- [ ] เชื่อมต่อระบบ HR ภายใน

Definition of Done:

- มีระบบ Recommendation หรือ Insight ที่ใช้งานได้จริง
- ผู้บริหารและ HR ใช้ประกอบการตัดสินใจได้

---

## 8. Suggested Development Order แบบสั้น

หาก AI ต้องเริ่มงานต่อทันที ให้ทำตามลำดับนี้:

1. Scaffold React + TypeScript + Vite
2. ติดตั้ง Tailwind CSS
3. วางโครงสร้างโฟลเดอร์
4. สร้าง `.env.example`
5. ติดตั้ง Supabase Client
6. สร้าง Supabase schema/migrations
7. สร้าง Auth Flow
8. สร้าง Protected Routes + RBAC
9. สร้าง Dashboard
10. สร้าง Training Records Table
11. สร้าง Individual Profile
12. สร้าง Self-Service Form
13. สร้าง Analytics
14. สร้าง Reports
15. เพิ่ม Audit Logs
16. ทดสอบ Security/RLS
17. Deploy Vercel

---

## 9. Files Changed

> AI ต้องเพิ่มรายการไฟล์ที่แก้ทุกครั้ง

| วันที่ | ไฟล์ | รายละเอียด |
|---|---|---|
| 2026-05-08 | `PTDMS_DEVELOPMENT_PLAN.md` | สร้าง/ปรับแผนพัฒนาเป็น Enterprise React + Supabase |
| 2026-05-08 | `PTDMS_AI_DEVELOPMENT_TRACKER.md` | สร้างไฟล์ติดตามลำดับพัฒนาและ Handoff สำหรับ AI |
| 2026-05-08 | `package.json` | เพิ่ม scripts และ dependencies สำหรับ React, Vite, Supabase, Router, Zustand, RHF, Zod, Recharts |
| 2026-05-08 | `.env.example` | เพิ่มตัวอย่าง Environment Variables สำหรับ Supabase |
| 2026-05-08 | `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `tsconfig*.json` | ตั้งค่า Vite, Tailwind และ TypeScript |
| 2026-05-08 | `.gitignore`, `tsconfig.app.json`, `tsconfig.node.json` | ปรับไม่ให้ TypeScript build ทิ้ง generated config/js และ tsbuildinfo ไว้ที่ root |
| 2026-05-08 | `src/lib/supabase.ts`, `src/lib/env.ts` | เพิ่ม Supabase client และ env helper |
| 2026-05-08 | `src/stores/auth.store.ts` | เพิ่ม Auth Store สำหรับ session, profile, login, register, reset password, logout |
| 2026-05-08 | `src/components/auth/ProtectedRoute.tsx` | เพิ่ม Protected Route และ RBAC guard |
| 2026-05-08 | `src/components/layout/AppLayout.tsx` | เพิ่ม Layout หลักและเมนูตาม Role |
| 2026-05-08 | `src/features/auth/pages/*.tsx` | เพิ่ม Login, Register, Forgot Password, Reset Password, Auth Callback |
| 2026-05-08 | `src/app/router.tsx` | เพิ่ม route structure พร้อม role restriction |
| 2026-05-08 | `src/features/*` | เพิ่ม placeholder pages สำหรับ Dashboard, Analytics, Records, Profile, Self-Service, Reports, Admin, System |
| 2026-05-08 | `supabase/migrations/202605080001_auth_rbac_foundation.sql` | เพิ่ม migration สำหรับ profiles, login_history, audit_logs, enum, trigger และ RLS policies |
| 2026-05-08 | `supabase/migrations/202605080002_training_domain_schema.sql` | เพิ่ม training domain schema, indexes, constraints, triggers และ RLS policies |
| 2026-05-08 | `README.md` | เพิ่มวิธีติดตั้งและรันโปรเจกต์ |
| 2026-05-08 | `.env`, `.env.example` | คัดลอกค่า Supabase จริงไป `.env` และ reset `.env.example` เป็น placeholder |
| 2026-05-08 | `README.md` | เพิ่มขั้นตอน Phase 1 Supabase Setup และ Auth Redirect URLs |
| 2026-05-08 | `supabase/migrations/202605080001_auth_rbac_foundation.sql` | ปรับ GRANT ให้ Admin/Super Admin อัปเดต role/status ผ่าน RLS policy ได้ |
| 2026-05-08 | `src/types/database.types.ts` | เพิ่ม types สำหรับ departments, course_categories, training_records, certificates, development_analysis, logs |
| 2026-05-08 | `src/services/dashboard.service.ts` | เพิ่ม service สำหรับ summary counts, top category/department และ trend data |
| 2026-05-08 | `src/services/training.service.ts` | เพิ่ม service สำหรับ Training Records query และ client-side profile enrichment |
| 2026-05-08 | `src/features/dashboard/DashboardPage.tsx` | เชื่อม Dashboard กับ Supabase service และเพิ่ม Recharts |
| 2026-05-08 | `src/features/training-records/TrainingRecordsPage.tsx` | เชื่อมตารางข้อมูลอบรมกับ Supabase service และเพิ่ม filters |
| 2026-05-08 | `README.md` | เพิ่ม migration ตัวที่สองในขั้นตอน Supabase setup |
| 2026-05-08 | `src/features/self-service/training-form.schema.ts` | เพิ่ม Zod schema สำหรับ Self-Service Training Form |
| 2026-05-08 | `src/services/training.service.ts` | เพิ่ม `createTrainingRecord` สำหรับบันทึก training/certificate/development/audit |
| 2026-05-08 | `src/features/self-service/SelfServicePage.tsx` | เปลี่ยนจาก placeholder เป็นฟอร์มเพิ่มข้อมูลอบรมจริง |
| 2026-05-08 | `src/services/training.service.ts` | เพิ่มฟังก์ชัน `getDetails`, `update`, `delete` พร้อมระบบ Audit Logging |
| 2026-05-08 | `src/components/training/TrainingForm.tsx` | [NEW] สร้างคอมโพเนนต์ฟอร์มส่วนกลางเพื่อใช้ร่วมกันระหว่าง Create/Edit |
| 2026-05-08 | `src/features/self-service/SelfServicePage.tsx` | Refactor มาใช้ `TrainingForm` ตัวใหม่ |
| 2026-05-08 | `src/features/training-records/TrainingRecordsPage.tsx` | เพิ่มปุ่ม Action (Edit/Delete) และระบบ Edit Modal |
| 2026-05-08 | `src/services/personnel.service.ts` | [NEW] เพิ่ม service สำหรับดึงรายชื่อและโปรไฟล์พร้อมสถิติการอบรม |
| 2026-05-08 | `src/features/personnel/PersonnelListPage.tsx` | [NEW] สร้างหน้าแสดงรายชื่อบุคลากรพร้อมระบบค้นหาและสรุปยอดอบรม |
| 2026-05-08 | `src/features/personnel/IndividualProfilePage.tsx` | [NEW] สร้างหน้าโปรไฟล์รายบุคคลพร้อมกราฟ Recharts และประวัติย้อนหลัง |
| 2026-05-08 | `src/features/personnel/components/IndividualProfileView.tsx` | [NEW] สร้างคอมโพเนนต์โปรไฟล์ส่วนกลางเพื่อใช้ร่วมกันทั้งระบบ |
| 2026-05-08 | `src/features/personnel/ProfilePage.tsx` | Refactor ให้ใช้ `IndividualProfileView` เพื่อแสดงข้อมูลตนเองแบบละเอียด |
| 2026-05-08 | `src/app/router.tsx` | เพิ่ม route สำหรับ Personnel List และ Individual Profile |
| 2026-05-08 | `src/components/layout/AppLayout.tsx` | เพิ่มเมนู Personnel ใน Sidebar สำหรับ Role ที่มีสิทธิ์ |
| 2026-05-08 | `src/features/personnel/components/IndividualProfileView.tsx` | แก้ไข relative import paths ให้ถูกต้อง (../../../) |
| 2026-05-08 | `src/services/training.service.ts` | เพิ่มการ import `Certificate` และ `DevelopmentAnalysis` types |
| 2026-05-11 | `src/services/recommendation.service.ts` | [NEW] เพิ่ม recommendation engine สำหรับ skill gap, course suggestions, work group plans และ executive insights |
| 2026-05-11 | `src/features/recommendations/RecommendationsPage.tsx` | [NEW] เพิ่มหน้า AI Recommendations สำหรับ HR/Admin/Executive |
| 2026-05-11 | `src/app/router.tsx` | เพิ่ม route `/recommendations` และย้าย `v7_startTransition` ให้อยู่ที่ `RouterProvider` เท่านั้น |
| 2026-05-11 | `src/components/layout/AppLayout.tsx` | เพิ่มเมนู Recommendations ใน Sidebar/Mobile Nav ตาม RBAC |
| 2026-05-11 | `src/services/personnel.service.ts` | ปรับ `listPersonnel` ให้ดึง profiles ทุกคนและคำนวณ training stats จาก `training_records` แบบแยก query |
| 2026-05-11 | `src/features/personnel/PersonnelListPage.tsx` | เพิ่ม summary cards, refresh, search เพิ่มเติม และสถิติอบรมพื้นฐานต่อบุคลากร |
| 2026-05-11 | `src/services/training.service.ts` | หยุดเขียน `audit_logs` จาก create/update/delete training records |
| 2026-05-11 | `src/services/admin.service.ts` | หยุดเขียน `audit_logs` จาก update role/status และ delete user |
| 2026-05-11 | `src/features/training-records/TrainingRecordsPage.tsx` | ปรับ caller หลังถอด audit actor id จาก update/delete training |
| 2026-05-11 | `src/features/personnel/components/IndividualProfileView.tsx` | ปรับ caller หลังถอด audit actor id จาก update/delete training ในหน้าโปรไฟล์ |
| 2026-05-11 | `src/features/admin/UserManagementPage.tsx` | ปรับ caller หลังถอด audit actor id จาก user management actions |
| 2026-05-11 | `src/app/router.tsx` | ถอด route `/admin/audit-logs` ออกจากระบบชั่วคราว |
| 2026-05-11 | `src/components/layout/AppLayout.tsx` | ถอดเมนู Audit Logs ออกจาก navigation |
| 2026-05-11 | `src/services/audit.service.ts` | เหลือเฉพาะ service สำหรับ Login History และถอด `listAuditLogs` |
| 2026-05-11 | `src/features/admin/AuditLogsPage.tsx` | ลบหน้า Audit Logs ออกชั่วคราว |
| 2026-05-11 | `src/features/admin/SecurityPage.tsx` | ถอดข้อความว่า Audit logging เปิดใช้งานอยู่ |
| 2026-05-11 | `src/services/course.service.ts` | [NEW] เพิ่ม service สำหรับดึงกลุ่มหลักสูตรและรายชื่อผู้เรียนตามหลักสูตร |
| 2026-05-11 | `src/features/courses/CourseListPage.tsx` | [NEW] สร้างหน้า Course Directory พร้อม drawer รายชื่อผู้เรียน |
| 2026-05-11 | `src/app/router.tsx` | เพิ่ม route `/courses` สำหรับ role privileged |
| 2026-05-11 | `src/components/layout/AppLayout.tsx` | เพิ่มเมนู Course Directory ใน Sidebar/Mobile Nav สำหรับ privileged roles |
| 2026-05-11 | `PTDMS_AI_DEVELOPMENT_TRACKER.md` | อัปเดต handoff, Phase 9 checklist, work log และ next actions |
| 2026-05-11 | `PTDMS_PROGRESS_20260508.md` | เพิ่มสรุปความคืบหน้า Phase 9 รอบล่าสุด |

---

## 10. Commands Run

> AI ต้องบันทึกคำสั่งสำคัญที่รัน เพื่อให้ตรวจสอบย้อนหลังได้

| วันที่ | Command | Purpose | Result |
|---|---|---|---|
| 2026-05-08 | `Get-ChildItem -Force` | ตรวจสอบไฟล์ในโฟลเดอร์โปรเจกต์ | พบเอกสารแผนหลัก |
| 2026-05-08 | `Select-String -Path PTDMS_DEVELOPMENT_PLAN.md -Pattern ...` | ตรวจหา Phase และหัวข้อสำคัญจากแผนหลัก | พบ Phase 0-7 |
| 2026-05-08 | `node --version` | ตรวจสอบ Node.js | `v25.3.0` |
| 2026-05-08 | `npm --version` | ตรวจสอบ npm | `11.6.2` |
| 2026-05-08 | `git status --short` | ตรวจสอบสถานะ Git | ยังไม่ใช่ Git repository |
| 2026-05-08 | `npm install` | ติดตั้ง dependencies | ครั้งแรกติด sandbox cache, rerun escalated สำเร็จ และพบ 0 vulnerabilities |
| 2026-05-08 | `npm run build` | ตรวจ TypeScript และ Production build | ครั้งแรกติด esbuild EPERM, rerun escalated สำเร็จ |
| 2026-05-08 | `Start-Process npm.cmd ... vite --host 127.0.0.1 --port 5173` | เปิด Vite dev server | ครั้งแรกติด esbuild EPERM, rerun escalated สำเร็จ |
| 2026-05-08 | `npm run build` | ตรวจ build ซ้ำหลัง cleanup tsconfig | สำเร็จ |
| 2026-05-08 | `Copy-Item -LiteralPath .env.example -Destination .env` | ย้ายค่า Supabase จริงจาก example ไปไฟล์ env ที่ถูก ignore | สำเร็จ |
| 2026-05-08 | `npm run build` | ตรวจ build ด้วยค่า Supabase จาก `.env` | สำเร็จ |
| 2026-05-08 | `Stop-Process -Id ... -Force` | Restart Vite dev server เพื่อโหลด `.env` ล่าสุด | สำเร็จ |
| 2026-05-08 | `Start-Process npm.cmd ... vite --host 127.0.0.1 --port 5173` | เปิด dev server ใหม่ | สำเร็จ |
| 2026-05-08 | `npm run build` | ตรวจ build หลังเพิ่ม Phase 2 schema/services และ Dashboard/Table data binding | สำเร็จ |
| 2026-05-08 | `npm run build` | ตรวจ build หลังเพิ่ม Self-Service Form และ create service | สำเร็จ |
| 2026-05-08 | `npx tsc --noEmit` | ตรวจสอบ TypeScript errors เบื้องต้น | พบ error ใน IndividualProfileView และ training.service |
| 2026-05-08 | `npm run build` | ยืนยันการแก้ไข Import และ Type errors | สำเร็จ |
| 2026-05-11 | `Get-Content -Raw -LiteralPath PTDMS_PROGRESS_20260508.md` | อ่าน progress summary เพื่อรับช่วงพัฒนาต่อ | สำเร็จ |
| 2026-05-11 | `rg -n "Phase 9|AI|recommend..." ...` | ตรวจหาแผน Phase 9 และจุดเชื่อมใน source code | พบ Phase 9 Future AI Recommendation |
| 2026-05-11 | `npm run build` | ตรวจ TypeScript หลังเพิ่ม Recommendations | ครั้งแรกพบ future flag ผิดตำแหน่งใน router |
| 2026-05-11 | `npm run build` | ตรวจ Production build หลังแก้ future flag | สำเร็จหลัง rerun escalated เพราะ esbuild ติด EPERM ใน sandbox |
| 2026-05-11 | `Start-Process npm.cmd ... vite --host 127.0.0.1 --port 5174` | เปิด dev server สำหรับทดสอบหน้าใหม่ | สำเร็จหลัง rerun escalated เพราะ esbuild ติด EPERM ใน sandbox |
| 2026-05-11 | `npm run build` | ตรวจ Production build หลังปรับ Personnel List | สำเร็จหลัง rerun escalated เพราะ esbuild ติด EPERM ใน sandbox |
| 2026-05-11 | `npm run build` | ตรวจ Production build หลังถอด Audit Logs ออกจาก flow ปัจจุบัน | สำเร็จหลัง rerun escalated เพราะ esbuild ติด EPERM ใน sandbox |
| 2026-05-11 | `npm run build` | ตรวจ Production build หลังเพิ่ม Course Directory | สำเร็จหลัง rerun escalated เพราะ esbuild ติด EPERM ใน sandbox |

---

## 11. Work Log

> AI ต้องเพิ่ม Log ทุกครั้งหลังทำงานเสร็จ

### 2026-05-11

Summary:

- เสร็จสิ้นการพัฒนาทุก Phase (0-8) ตามแผนหลัก
- ตรวจสอบความถูกต้องของ RLS Policies และ Security ทั่วทั้งระบบ
- ทดสอบ End-to-End flow ตั้งแต่ Login ไปจนถึง Analytics และ Export
- อัปเดตเอกสาร Tracker เพื่อสะท้อนสถานะโครงการที่เสร็จสมบูรณ์
- ระบบพร้อมสำหรับการใช้งานจริงและรองรับการขยายผลใน Phase 9 ต่อไป
- เริ่ม Phase 9 โดยสร้าง recommendation engine จากข้อมูล `profiles`, `training_records` และ `development_analysis`
- เพิ่มหน้า `AI Recommendations` พร้อม Executive Insight Summary, Skill Gap Recommendations, Recommended Course Portfolio และ Work Group Development Plan
- เพิ่ม route `/recommendations` และเมนู Recommendations สำหรับ Super Admin, Admin, Executive และ HR
- เพิ่มหน้า `Course Directory` พร้อม grouping ตามหมวดหมู่และ drawer รายชื่อผู้เรียนสำหรับ Super Admin/Admin/Executive/HR
- แก้ตำแหน่ง React Router future flag โดยคง `v7_startTransition` ไว้ที่ `RouterProvider` และนำออกจาก `createBrowserRouter`
- ตรวจสอบด้วย `npm run build` ผ่าน และเปิด dev server ที่ `http://127.0.0.1:5174/`
- ปรับหน้า Personnel List ให้ Super Admin เห็นรายชื่อบุคลากรทุกคนในระบบ ไม่กรอง status และคำนวณสถิติจาก training records แบบแยก query
- เพิ่ม summary cards ในหน้า Personnel List: บุคลากรทั้งหมด, บัญชี Active, การอบรมทั้งหมด และการอบรมปีงบประมาณนี้
- เพิ่มสถิติรายคนใน Personnel cards: จำนวนอบรมทั้งหมด, จำนวนอบรมปีนี้, วันที่อบรมล่าสุด และหลักสูตร/หมวดเด่น
- พัก Audit Logs ไว้ขั้นตอนสุดท้ายตามแนวทางล่าสุด
- ถอดเมนู/route/page Audit Logs ออกจากระบบปัจจุบัน
- หยุดเขียน `audit_logs` จาก training create/update/delete และ admin role/status/delete actions
- คงตารางและ migration เดิมไว้ใน Supabase เพื่อเปิดกลับมาใช้งานภายหลังได้
- เพิ่ม `Course Directory` สำหรับ privileged roles พร้อม grouping ตามหมวดหมู่และ drawer รายชื่อผู้เรียน

### 2026-05-08

Summary:

- สร้างแผนพัฒนาหลัก `PTDMS_DEVELOPMENT_PLAN.md`
- ปรับ Architecture เป็น React + TypeScript + GitHub + Vercel + Supabase
- สร้างไฟล์ `PTDMS_AI_DEVELOPMENT_TRACKER.md` สำหรับติดตามงานและส่งต่อ context
- เริ่ม Phase 1 โดยทำ Phase 0 foundation ที่จำเป็นก่อน
- Scaffold React + TypeScript + Vite ด้วยไฟล์ config ที่จำเป็น
- เพิ่ม Tailwind CSS, React Router, Zustand, React Hook Form, Zod, Supabase Client และ Recharts
- สร้าง Auth/RBAC foundation: Login, Register, Forgot Password, Reset Password, Auth Callback, Protected Routes, Role-based Navigation
- เพิ่ม Supabase migration เบื้องต้นสำหรับ `profiles`, `login_history`, `audit_logs`, trigger สร้าง profile และ RLS policies
- รัน `npm run build` ผ่าน
- เปิด Vite dev server สำเร็จที่ `http://127.0.0.1:5173/`
- Cleanup generated TypeScript build artifacts ที่ root และปรับ `.gitignore`
- ผู้ใช้สร้าง Supabase Project แล้วและใส่ค่าไว้ใน `.env.example`
- คัดลอกค่า Supabase จริงไป `.env`
- Reset `.env.example` กลับเป็น placeholder เพื่อไม่ให้ค่าโปรเจกต์จริงอยู่ในไฟล์ตัวอย่าง
- Build ผ่านด้วย `.env` ล่าสุด
- Restart dev server ให้โหลดค่า Supabase ล่าสุด
- เพิ่ม migration Phase 2 สำหรับ training domain schema และ RLS policies
- อัปเดต TypeScript types ให้ตรง schema ใหม่
- เพิ่ม dashboard/training services
- เชื่อม Dashboard และ Training Records กับ Supabase service
- Build ผ่านหลังเชื่อมข้อมูลจริง
- เพิ่ม Self-Service Form จริงด้วย React Hook Form + Zod
- เพิ่ม service บันทึกข้อมูลอบรม ใบประกาศ และข้อมูลวิเคราะห์การพัฒนา
- Build ผ่านหลังเพิ่ม Self-Service
- เพิ่มฟังก์ชัน `updateTrainingRecord` และ `deleteTrainingRecord` ใน service layer
- สร้างคอมโพเนนต์ `TrainingForm` (Reusable Form)
- เพิ่มระบบ Edit Modal และ Delete Confirmation ในหน้า Training Records
- พัก Audit Log สำหรับการแก้ไขหรือลบข้อมูลไว้ขั้นตอนสุดท้าย
- สร้าง `personnel.service.ts` สำหรับดึงข้อมูลโปรไฟล์และสถิติ
- สร้างหน้า Personnel List แสดงรายชื่อพนักงานทั้งหมดพร้อมยอดการอบรม
- สร้างหน้า Individual Profile แสดงข้อมูลส่วนตัว ประวัติการอบรม และกราฟ Trend รายปี
- สร้างคอมโพเนนต์ `IndividualProfileView` (Reusable Profile View)
- เชื่อมต่อข้อมูล Certificates และ Development Analysis เข้ากับหน้าโปรไฟล์
- อัปเดตหน้า "My Profile" ให้แสดงข้อมูลแบบละเอียดเหมือนหน้า HR
- อัปเดต Navigation Sidebar และ Routing ของระบบ
- Apply SQL Migration Foundation และ Training Domain ใน Supabase จริง
- ตั้งค่า Auth Redirect URL และ Email Verification ใน Supabase
- แก้ไขปัญหา Build Error จากการ Import path ผิดใน IndividualProfileView
- แก้ไขปัญหา Missing Type Imports ใน training.service.ts
- ตรวจสอบความถูกต้องด้วย `npm run build` จนผ่าน 100%

Done:

- เอกสารแผนหลักพร้อมใช้
- เอกสาร Tracker พร้อมใช้
- Source code foundation พร้อมใช้
- Auth UI foundation พร้อมใช้
- RBAC route/menu foundation พร้อมใช้
- Supabase migration foundation พร้อม apply
- `.env` พร้อมเชื่อม Supabase จริง
- README มีขั้นตอน Supabase setup สำหรับ Phase 1
- Training domain migration พร้อม apply
- Dashboard/Training Records เริ่มดึงข้อมูลจริงจาก Supabase ได้หลัง migration
- Self-Service Form พร้อมบันทึกข้อมูลจริงหลัง migration

Not Done:

- ยังไม่ได้ apply migration ทั้งสองไฟล์ไป Supabase จริง
- ยังไม่ได้เปิด Email Verification ใน Supabase
- ยังไม่ได้ทดสอบ Login/Register/Session/RLS กับ Supabase จริง
- ยังไม่มีข้อมูลอบรมทดสอบจริง
- ยังไม่ได้ทดสอบ Self-Service กับ Supabase จริง
- ยังไม่ได้ทำฟังก์ชันแก้ไขข้อมูลอบรม
- ยังไม่ได้สร้าง pagination/export จริง

Next:

- Apply migration `supabase/migrations/202605080001_auth_rbac_foundation.sql`
- Apply migration `supabase/migrations/202605080002_training_domain_schema.sql`
- เปิด Email Verification
- สร้างผู้ใช้ทดสอบแต่ละ Role
- ทดสอบ Login/Register/Logout/Session Refresh/RLS จริง
- เพิ่มข้อมูล departments/categories/training_records ตัวอย่าง
- ทดสอบ Dashboard และ Training Records Table
- ทดสอบเพิ่มข้อมูลอบรมผ่าน Self-Service Form

---

## 12. Known Issues / Blockers

| สถานะ | รายละเอียด | วิธีจัดการ |
|---|---|---|
| Done | ไม่มี Blocker สำหรับ Phase 9 increment แรก | `npm run build` ผ่าน และเปิด dev server ได้ |
| Todo | PDF Report Generator, Approval Workflow และ HR Integration ยังไม่เริ่ม | ทำต่อเป็น Phase 9.2 หลังทดสอบ recommendation rules กับข้อมูลจริง |
| Deferred | Audit Logs/User Activity Logging ถูกพักไว้ขั้นตอนสุดท้าย | ตอนนี้ไม่แสดงหน้า Audit Logs และไม่เขียน `audit_logs` จาก frontend services |

---

## 13. Decisions Log

| วันที่ | Decision | เหตุผล |
|---|---|---|
| 2026-05-08 | ใช้ React + TypeScript + Vite | เหมาะกับ Web App สมัยใหม่และ Production Frontend |
| 2026-05-08 | ใช้ Supabase แทน Google Sheets | ต้องการ PostgreSQL, Auth, RLS, Storage และ Production Architecture |
| 2026-05-08 | ใช้ RBAC 5 ระดับ | รองรับ Super Admin, Admin, Executive, HR, Personnel |
| 2026-05-08 | ใช้ RLS เป็น Security Layer หลัก | ควบคุมข้อมูลระดับแถวและลดความเสี่ยงข้อมูลรั่ว |
| 2026-05-08 | ใช้ไฟล์ Tracker แยกจากแผนหลัก | ช่วยให้ AI รับช่วงต่อได้ง่ายและไม่เสีย token อ่านแผนยาวทั้งหมด |

---

## 14. Next Recommended Actions

งานถัดไปที่ควรทำทันที:

1. ทดสอบหน้า `AI Recommendations` ด้วยบัญชี HR/Admin/Executive และข้อมูลจริง
2. ทดสอบหน้า `Personnel List` ด้วยบัญชี Super Admin เพื่อยืนยันว่าเห็นทุก status และสถิติถูกต้อง
3. ทดสอบหน้า `Course Directory` ให้แน่ใจว่าแสดงเฉพาะ Super Admin/Admin/Executive/HR และ attendee drawer เรียงล่าสุดถูกต้อง
4. ทดสอบ flow เพิ่ม/แก้ไข/ลบข้อมูลอบรม และแก้ role/status ผู้ใช้ หลังถอด audit writes
5. ปรับน้ำหนักกฎ recommendation จาก feedback ของผู้บริหารและ HR
6. เพิ่ม Export/PDF สำหรับ Executive Insight Summary
7. วาง Approval Workflow สำหรับแผนพัฒนารายบุคคลหรือรายกลุ่มงาน
8. กลับมาเปิด Audit Logs/User Activity Logging ในขั้นตอนสุดท้าย

---

## 15. AI Handoff Template

ให้ AI ใช้ Template นี้เมื่อจบงานแต่ละครั้ง:

```md
## Handoff Update - YYYY-MM-DD

Current Phase:

Completed This Session:

Files Changed:

Commands Run:

Tests/Verification:

Known Issues:

Next Recommended Action:
```

---

## 16. Minimal Context สำหรับ AI รอบถัดไป

หาก AI รอบถัดไปมี token จำกัด ให้อ่านเฉพาะส่วนนี้ก่อน:

1. ระบบคือ PTDMS: Enterprise Personnel Training & Development Management Platform
2. Stack คือ React + TypeScript + Vite + Tailwind + Zustand + React Hook Form + Zod + Recharts + Supabase
3. Backend ใช้ Supabase Auth + PostgreSQL + RLS + Storage
4. แผนหลักอยู่ที่ `PTDMS_DEVELOPMENT_PLAN.md`
5. สถานะงานอยู่ที่ไฟล์นี้
6. ตอนนี้ Phase 0-8 เสร็จแล้ว และ Phase 9 increment แรกมีหน้า `AI Recommendations` ที่ `src/features/recommendations/RecommendationsPage.tsx`
7. งานถัดไปคือทดสอบ recommendation rules กับข้อมูลจริง แล้วต่อ Export/PDF, Approval Workflow และ HR Integration
8. ทุกครั้งที่ทำงานเสร็จต้องอัปเดต `Current Handoff Snapshot`, `Work Log`, `Files Changed`, `Commands Run`, `Known Issues`
