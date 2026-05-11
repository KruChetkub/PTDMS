# แผนพัฒนาระบบ PTDMS

**Personnel Training & Development Management System**  
**Enterprise Personnel Training & Development Management Platform**  
Architecture: **React + TypeScript + GitHub + Vercel + Supabase**

---

## 1. ภาพรวมโครงการ

### 1.1 วัตถุประสงค์

พัฒนาระบบ Web Application ระดับ Production สำหรับบริหารจัดการข้อมูลการฝึกอบรมและการพัฒนาบุคลากรภายในหน่วยงาน โดยรองรับ Dashboard ผู้บริหาร ประวัติการอบรมรายบุคคล การวิเคราะห์แนวทางการพัฒนา Self-Service สำหรับบุคลากร Role-Based Access Control (RBAC), Authentication ระดับ Production, Responsive Design ทุกอุปกรณ์ และ Security ตามแนวทาง OWASP

ระบบนี้ออกแบบให้สามารถใช้งานจริงในระดับองค์กร ขยายต่อได้ในอนาคต และต่อยอดเป็น HR Analytics Platform ได้

### 1.2 เป้าหมายหลัก

- รวมข้อมูลการฝึกอบรมไว้เป็นศูนย์กลาง
- ดูประวัติการอบรมย้อนหลังได้
- วิเคราะห์แนวทางการพัฒนาบุคลากร
- ให้บุคลากรอัปเดตข้อมูลการอบรมของตนเอง
- สนับสนุนการตัดสินใจของผู้บริหาร
- ลดภาระงานเอกสารของ HR
- รองรับการขยายระดับองค์กร
- รองรับ Security, Audit และ Governance
- พัฒนาเป็น HR Analytics Platform ในอนาคต

### 1.3 แนวคิดหลักของระบบ

ระบบนี้คือ **Enterprise Personnel Training & Development Management Platform** ประกอบด้วย:

- Dashboard ผู้บริหาร
- ระบบวิเคราะห์การพัฒนา
- โปรไฟล์รายบุคคล
- Self-Service สำหรับบุคลากร
- RBAC
- Authentication ระดับ Production
- Responsive Design ทุกอุปกรณ์
- Security ตาม OWASP
- PostgreSQL + Row Level Security
- Audit Logs
- Production Ready Architecture

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS |
| Routing | React Router |
| State Management | Zustand |
| Form Management | React Hook Form |
| Validation | Zod |
| Charts | Recharts |
| Backend Platform | Supabase |
| Database | PostgreSQL |
| Authentication | Supabase Auth |
| Storage | Supabase Storage |
| Security | Supabase RLS + OWASP Best Practices |
| Deployment | Vercel |
| Version Control | GitHub |

---

## 3. Enterprise Architecture

### 3.1 High-Level Architecture

```text
User Browser
    |
    v
React + TypeScript + Vite Frontend
    |
    v
Supabase Client SDK
    |
    +----------------------+
    | Supabase Auth        |
    | PostgreSQL Database  |
    | Row Level Security   |
    | Supabase Storage     |
    | Audit Logs           |
    +----------------------+
    |
    v
Vercel Hosting + GitHub CI/CD
```

### 3.2 Architecture Principles

- Frontend แยกจาก Backend อย่างชัดเจน
- ใช้ Supabase เป็น Backend-as-a-Service สำหรับ Auth, Database และ Storage
- ใช้ PostgreSQL เป็นฐานข้อมูลหลัก
- ใช้ Row Level Security เพื่อควบคุมข้อมูลระดับแถว
- ใช้ RBAC ควบคุมสิทธิ์ระดับระบบและระดับหน้า
- ไม่เก็บ Secret Key ใน Frontend
- ใช้ Environment Variables สำหรับค่าการเชื่อมต่อ
- รองรับ Deployment ผ่าน GitHub และ Vercel
- ออกแบบให้เพิ่ม Edge Functions หรือ API Layer เพิ่มเติมได้ในอนาคต

### 3.3 Deployment Architecture

```text
Developer
    |
    v
GitHub Repository
    |
    v
Vercel Build & Deploy
    |
    v
Production Web App
    |
    v
Supabase Project
```

---

## 4. IPO Framework

## I - Input

### 4.1 เป้าหมายของ Input

รวบรวมข้อมูลบุคลากร ข้อมูลการอบรม และข้อมูลการพัฒนาให้อยู่ในระบบเดียวกัน เพื่อใช้ในการแสดงผล วิเคราะห์ และติดตามการพัฒนาบุคลากร

### 4.2 ข้อมูลผู้ใช้งานระบบ: Users

ข้อมูลบัญชีผู้ใช้หลักจัดการผ่าน `auth.users` ของ Supabase Auth

| Field | รายละเอียด |
|---|---|
| id | UUID ผู้ใช้งาน |
| email | Email สำหรับ Login |
| password | จัดการผ่าน Supabase Auth |
| role | สิทธิ์ผู้ใช้งาน |
| status | สถานะบัญชี |
| created_at | วันที่สร้างบัญชี |

หมายเหตุ:

- ไม่เก็บ Password ในตารางของระบบเอง
- Password, Reset Password และ Email Verification จัดการโดย Supabase Auth
- Role และ Status ควรเก็บในตาราง `profiles` หรือ `user_roles`

### 4.3 ข้อมูลโปรไฟล์บุคลากร: Profiles

| Field | รายละเอียด |
|---|---|
| user_id | เชื่อมกับ `auth.users.id` |
| employee_code | รหัสบุคลากร |
| full_name | ชื่อ-สกุล |
| position | ตำแหน่ง |
| department | กลุ่มงาน |
| avatar_url | รูปโปรไฟล์ |

### 4.4 ระดับผู้ใช้งาน: RBAC Roles

#### Super Admin

- จัดการระบบทั้งหมด
- จัดการ Security
- จัดการ Roles & Permissions
- เข้าถึงทุกข้อมูล
- ตรวจสอบ Audit Logs

#### Admin

- จัดการข้อมูลทั้งหมด
- จัดการบุคลากร
- จัดการหลักสูตร
- Export รายงาน

#### Executive

- ดู Dashboard ภาพรวม
- ดูข้อมูลทุกหน่วยงาน
- ดูข้อมูลรายบุคคล
- วิเคราะห์แนวทางการพัฒนา
- ดูย้อนหลังรายเดือน/รายปี

#### HR

- เพิ่ม/แก้ไขข้อมูลอบรม
- Import Excel
- ตรวจสอบข้อมูล
- ดูข้อมูลทุกคน
- Export รายงาน

#### Personnel

- Login เข้าระบบ
- ดูข้อมูลตนเอง
- เพิ่มข้อมูลอบรมของตนเอง
- แก้ไขข้อมูลของตนเอง
- ดูใบประกาศและประวัติย้อนหลังของตนเอง

### 4.5 ข้อมูลการอบรม: Training Records

| Field | รายละเอียด |
|---|---|
| id | UUID |
| user_id | เจ้าของข้อมูล |
| course | ชื่อหลักสูตร |
| category | ประเภทการอบรม |
| subcategory | หมวดย่อย |
| organizer | หน่วยงานผู้จัด |
| date | วันที่อบรม |
| month | เดือน |
| year | ปีงบประมาณ |
| created_at | วันที่สร้างข้อมูล |

### 4.6 ข้อมูลใบประกาศ: Certificates

| Field | รายละเอียด |
|---|---|
| training_id | อ้างอิง Training |
| certificate_name | ชื่อใบประกาศ |
| certificate_link | ลิงก์ใบประกาศ |

### 4.7 ข้อมูลวิเคราะห์การพัฒนา: Development Analysis

| Field | รายละเอียด |
|---|---|
| development_area | ด้านการพัฒนา |
| skill_group | กลุ่มทักษะ |
| target_direction | แนวทางการพัฒนา |

### 4.8 ระบบ Upload Files

ใช้ **Supabase Storage** เพื่อรองรับ:

- Avatar
- เอกสารเพิ่มเติม
- ไฟล์ประกอบการอบรม
- ไฟล์ใบประกาศในอนาคต

### 4.9 Database System

ใช้:

- Supabase
- PostgreSQL Database
- Row Level Security (RLS)
- Supabase Auth
- Supabase Storage

### 4.10 วิธีนำเข้าข้อมูล

ระบบต้องรองรับ:

- Import Excel
- CSV Upload
- Form Input
- Self-Service Input
- เพิ่มข้อมูลย้อนหลัง

### 4.11 Security Input Validation

ระบบต้อง:

- Validate ทุกฟอร์ม
- Sanitize Input
- ตรวจสอบ URL
- ตรวจสอบข้อมูลซ้ำ
- จำกัดสิทธิ์การเข้าถึงข้อมูล
- ตรวจสอบชนิดและขนาดไฟล์ Upload
- บันทึก Audit Logs เมื่อมีการเพิ่ม/แก้ไข/ลบข้อมูลสำคัญ

---

## P - Process

### 4.12 เป้าหมายของ Process

จัดการข้อมูล วิเคราะห์ และแสดงผลอย่างปลอดภัย รองรับการขยายระบบในระดับองค์กร และพร้อมใช้งานจริงใน Production

### 4.13 Frontend Stack

ใช้:

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- React Hook Form
- Zod
- Zustand
- Recharts

### 4.14 Backend & Database

ใช้:

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Row Level Security (RLS)

### 4.15 Hosting & Deployment

ใช้:

- GitHub
- Vercel
- Supabase Cloud

### 4.16 Responsive Design Requirements

ระบบต้องรองรับ:

- Desktop
- Laptop
- Tablet
- Mobile

หน้าระบบที่ต้อง Responsive:

| หน้าระบบ | รองรับ |
|---|---|
| Dashboard | Yes |
| Analytics | Yes |
| ตารางข้อมูล | Yes |
| โปรไฟล์รายบุคคล | Yes |
| ฟอร์มกรอกข้อมูล | Yes |
| Login/Register | Yes |
| Reports | Yes |
| User Management | Yes |

### 4.17 Authentication Flow

ระบบต้องมี:

- Register
- Login
- Logout
- Forgot Password
- Reset Password
- Email Verification
- Session Management
- Auto Session Refresh
- Protected Routes

Authentication Flow:

```text
User opens app
    |
    v
Check Supabase session
    |
    +--> No session -> Login Page
    |
    +--> Active session -> Load profile + role
                                |
                                v
                          Protected Route
                                |
                                v
                          App Dashboard
```

### 4.18 Security Architecture

ระบบต้องใช้แนวทาง:

- OWASP Security Best Practices
- Least Privilege Access
- Secure Session Handling
- Input Sanitization
- XSS Protection
- SQL Injection Prevention
- CSRF Awareness
- Environment Variable Protection
- Secure File Access
- Audit Logging

### 4.19 Role-Based Access Control

ระบบต้อง:

- ตรวจสอบสิทธิ์ทุก Request
- จำกัด Route ตาม Role
- จำกัด Database Access ผ่าน RLS
- จำกัดการแสดงเมนูตาม Role
- จำกัดการ Export ตาม Role
- จำกัดการเข้าถึงไฟล์ใน Storage ตาม Role

### 4.20 Data Processing

ระบบต้อง:

- แปลงข้อมูลจาก Supabase เป็น JSON
- วิเคราะห์ข้อมูลรายเดือน/รายปี
- วิเคราะห์ประเภทการอบรม
- วิเคราะห์แนวทางการพัฒนา
- ตรวจสอบข้อมูลซ้ำ
- สรุปข้อมูลรายบุคคล
- สรุปข้อมูลรายหน่วยงาน
- สร้างข้อมูลสำหรับ Chart และ Report

### 4.21 Search & Filter

รองรับ:

- ค้นหาชื่อ
- ค้นหาหลักสูตร
- Filter เดือน
- Filter ปี
- Filter หน่วยงาน
- Filter ประเภทการอบรม
- Filter บุคลากร
- Filter กลุ่มทักษะ

### 4.22 Individual Personnel Profile

แสดง:

- ประวัติการอบรมทั้งหมด
- แนวทางการพัฒนา
- จำนวนการอบรมย้อนหลัง
- ใบประกาศย้อนหลัง
- แนวโน้มรายปี
- ข้อมูลโปรไฟล์บุคลากร

### 4.23 Dashboard Analytics

วิเคราะห์:

- จำนวนบุคลากร
- จำนวนรายการอบรม
- การอบรมรายเดือน
- การอบรมรายปี
- หลักสูตรยอดนิยม
- การพัฒนารายบุคคล
- แนวโน้มหน่วยงาน
- ประเภทการอบรมยอดนิยม

### 4.24 Visualization

ใช้ **Recharts** และรองรับ:

- Summary Cards
- Bar Chart
- Line Chart
- Trend Analysis
- Category Analysis
- Monthly Analysis
- Yearly Analysis
- Department Analysis

### 4.25 Self-Service Process

```text
Personnel Login
    |
    v
กรอกข้อมูลอบรม
    |
    v
Validate ด้วย Zod
    |
    v
ส่งข้อมูลไป Supabase
    |
    v
บันทึก PostgreSQL
    |
    v
แสดงใน Dashboard และ Profile
```

### 4.26 Reporting System

รองรับ:

- Export CSV
- Export Excel
- รายงานรายเดือน
- รายงานรายปี
- รายงานรายบุคคล
- รายงานรายหน่วยงาน

### 4.27 Security Processing

ระบบต้อง:

- ใช้ HTTPS
- ใช้ Environment Variables
- ไม่เก็บ Secret Key ใน Frontend
- ใช้ Secure Session
- ใช้ RLS Policies
- ใช้ Secure File Access
- Backup Database
- Audit Logs
- จำกัด Service Role Key เฉพาะ Server-side หรือ Supabase Edge Functions

### 4.28 Audit Logging

ระบบต้องเก็บ:

- Login History
- การเพิ่มข้อมูล
- การแก้ไขข้อมูล
- การลบข้อมูล
- User Activity
- Export Activity
- Admin Security Actions

---

## O - Output

### 4.29 เป้าหมายของ Output

แสดงข้อมูล วิเคราะห์แนวโน้ม และสนับสนุนการตัดสินใจเชิงบริหารอย่างปลอดภัยและตรวจสอบย้อนหลังได้

### 4.30 Executive Dashboard

แสดง:

- จำนวนบุคลากร
- จำนวนการอบรม
- หน่วยงานที่อบรมมากที่สุด
- แนวโน้มรายเดือน
- แนวโน้มรายปี
- ประเภทการอบรมยอดนิยม
- หลักสูตรยอดนิยม

รองรับ:

- Filter เดือน
- Filter ปี
- Filter หน่วยงาน
- Filter ประเภทการอบรม

### 4.31 Individual Personnel Dashboard

แสดง:

- ประวัติการอบรม
- แนวทางการพัฒนา
- ใบประกาศย้อนหลัง
- จำนวนการอบรมย้อนหลัง
- กราฟพัฒนาการรายปี

### 4.32 Analytics Dashboard

แสดง:

- Training Trend
- Development Trend
- Category Analysis
- Department Analysis
- Monthly Trend
- Yearly Trend
- Individual Development Analysis

### 4.33 Data Table

รองรับ:

- Search
- Filter
- Sort
- Pagination
- Column Visibility
- Export

### 4.34 Self-Service Form

บุคลากรสามารถ:

- เพิ่มข้อมูล
- แก้ไขข้อมูล
- เพิ่มลิงก์ใบประกาศ
- ดูข้อมูลย้อนหลัง
- อัปโหลดไฟล์ในอนาคต

### 4.35 Reports

ระบบต้อง:

- Export CSV
- Export Excel
- รายงานรายเดือน
- รายงานรายปี
- รายงานรายบุคคล
- รายงานรายหน่วยงาน

### 4.36 Security Output

ระบบต้อง:

- จำกัดข้อมูลตาม Role
- ใช้ Secure Session
- ตรวจสอบย้อนหลังได้
- ป้องกันข้อมูลรั่วไหล
- แสดงเฉพาะข้อมูลที่ผู้ใช้มีสิทธิ์

---

## 5. Database Design: PostgreSQL + Supabase

### 5.1 Entity Overview

```text
auth.users
    |
    v
profiles
    |
    +--> training_records
             |
             +--> certificates
             |
             +--> development_analysis

profiles
    |
    +--> audit_logs
```

### 5.2 Recommended Tables

- `profiles`
- `training_records`
- `certificates`
- `development_analysis`
- `course_categories`
- `departments`
- `audit_logs`
- `login_history`

### 5.3 Profiles Table

| Column | Type | Constraint |
|---|---|---|
| user_id | uuid | PK, FK `auth.users.id` |
| employee_code | text | unique |
| full_name | text | not null |
| position | text | nullable |
| department | text | nullable |
| role | text | not null |
| status | text | default `active` |
| avatar_url | text | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### 5.4 Training Records Table

| Column | Type | Constraint |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK `profiles.user_id` |
| course | text | not null |
| category | text | not null |
| subcategory | text | nullable |
| organizer | text | not null |
| date | date | not null |
| month | int | not null |
| year | int | not null |
| created_by | uuid | FK `profiles.user_id` |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### 5.5 Certificates Table

| Column | Type | Constraint |
|---|---|---|
| id | uuid | PK |
| training_id | uuid | FK `training_records.id` |
| certificate_name | text | nullable |
| certificate_link | text | nullable |
| file_path | text | nullable |
| created_at | timestamptz | default now() |

### 5.6 Development Analysis Table

| Column | Type | Constraint |
|---|---|---|
| id | uuid | PK |
| training_id | uuid | FK `training_records.id` |
| user_id | uuid | FK `profiles.user_id` |
| development_area | text | nullable |
| skill_group | text | nullable |
| target_direction | text | nullable |
| created_at | timestamptz | default now() |

### 5.7 Departments Table

| Column | Type | Constraint |
|---|---|---|
| id | uuid | PK |
| name | text | unique, not null |
| active | boolean | default true |
| created_at | timestamptz | default now() |

### 5.8 Course Categories Table

| Column | Type | Constraint |
|---|---|---|
| id | uuid | PK |
| category | text | not null |
| subcategory | text | nullable |
| active | boolean | default true |
| created_at | timestamptz | default now() |

### 5.9 Audit Logs Table

| Column | Type | Constraint |
|---|---|---|
| id | uuid | PK |
| actor_id | uuid | FK `profiles.user_id` |
| action | text | not null |
| resource_type | text | not null |
| resource_id | text | nullable |
| metadata | jsonb | nullable |
| ip_address | text | nullable |
| user_agent | text | nullable |
| created_at | timestamptz | default now() |

### 5.10 Login History Table

| Column | Type | Constraint |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK `profiles.user_id` |
| login_at | timestamptz | default now() |
| ip_address | text | nullable |
| user_agent | text | nullable |
| success | boolean | default true |

---

## 6. RBAC Permission Matrix

| Feature | Super Admin | Admin | Executive | HR | Personnel |
|---|---:|---:|---:|---:|---:|
| จัดการ Security | Yes | No | No | No | No |
| จัดการ Roles | Yes | No | No | No | No |
| จัดการผู้ใช้งาน | Yes | Yes | No | No | No |
| จัดการข้อมูลอบรมทั้งหมด | Yes | Yes | No | Yes | No |
| ดู Dashboard ภาพรวม | Yes | Yes | Yes | Yes | No |
| ดู Analytics | Yes | Yes | Yes | Yes | Own only |
| ดูข้อมูลทุกหน่วยงาน | Yes | Yes | Yes | Yes | No |
| ดูข้อมูลตนเอง | Yes | Yes | Yes | Yes | Yes |
| เพิ่มข้อมูลตนเอง | Yes | Yes | No | Yes | Yes |
| แก้ไขข้อมูลตนเอง | Yes | Yes | No | Yes | Yes |
| Export รายงาน | Yes | Yes | Yes | Yes | Own only |
| ดู Audit Logs | Yes | Limited | No | No | No |

---

## 7. Row Level Security Strategy

### 7.1 RLS Principles

- เปิด RLS ทุกตารางที่มีข้อมูลผู้ใช้
- Personnel อ่าน/แก้ไขเฉพาะข้อมูลของตนเอง
- HR อ่านข้อมูลทุกคนและแก้ไขข้อมูลการอบรมได้
- Executive อ่านข้อมูลทุกคน แต่ไม่แก้ไขข้อมูล
- Admin และ Super Admin เข้าถึงข้อมูลระดับระบบตามสิทธิ์
- Storage Access ต้องผูกกับ `auth.uid()` และ Role

### 7.2 RLS Policy Summary

| Table | Policy |
|---|---|
| profiles | ผู้ใช้ดูโปรไฟล์ตนเอง, HR/Admin/Super Admin ดูได้ทั้งหมด |
| training_records | ผู้ใช้ดู/แก้ไขของตนเอง, HR/Admin จัดการได้ทั้งหมด, Executive อ่านได้ทั้งหมด |
| certificates | อิงสิทธิ์จาก training_records |
| development_analysis | อิงสิทธิ์จาก training_records |
| audit_logs | Super Admin อ่านได้ทั้งหมด, Admin อ่านแบบจำกัด |
| departments | Authenticated users อ่านได้, Admin/HR จัดการได้ |
| course_categories | Authenticated users อ่านได้, Admin/HR จัดการได้ |

### 7.3 ตัวอย่างแนวคิด Policy

```sql
-- Personnel can read own training records.
create policy "read own training records"
on training_records
for select
to authenticated
using (user_id = auth.uid());

-- HR/Admin/Executive can read all training records.
create policy "privileged roles can read all training records"
on training_records
for select
to authenticated
using (
  exists (
    select 1
    from profiles
    where profiles.user_id = auth.uid()
      and profiles.role in ('super_admin', 'admin', 'executive', 'hr')
      and profiles.status = 'active'
  )
);
```

หมายเหตุ: SQL จริงควรจัดทำใน Migration และทดสอบกับทุก Role ก่อนขึ้น Production

---

## 8. Authentication & Session Management

### 8.1 Required Auth Features

- Register
- Login
- Logout
- Forgot Password
- Reset Password
- Email Verification
- Auto Session Refresh
- Protected Routes
- Role-based Redirect

### 8.2 Production Auth Rules

- บังคับ Email Verification ก่อนเข้าใช้งาน
- ปิด Register สาธารณะได้หากต้องการให้ Admin สร้างผู้ใช้
- ตรวจสอบ `status = active` ก่อนให้เข้าใช้งาน
- Session ต้องจัดการผ่าน Supabase Auth SDK
- ไม่จัดเก็บ Password เองในระบบ
- ไม่เก็บ Service Role Key ใน Frontend

### 8.3 Route Protection

| Route | Allowed Roles |
|---|---|
| `/login` | Public |
| `/register` | Public หรือ Admin-only ตามนโยบาย |
| `/dashboard` | Super Admin, Admin, Executive, HR |
| `/analytics` | Super Admin, Admin, Executive, HR |
| `/records` | Super Admin, Admin, Executive, HR |
| `/profile/:id` | Super Admin, Admin, Executive, HR, Owner |
| `/self-service` | Personnel, HR, Admin, Super Admin |
| `/reports` | Super Admin, Admin, Executive, HR |
| `/admin/users` | Super Admin, Admin |
| `/admin/security` | Super Admin |

---

## 9. Application Pages

### 9.1 Login / Register

ฟังก์ชัน:

- Login ด้วย Email และ Password
- Register หรือ Invite User ตามนโยบายองค์กร
- Forgot Password
- Reset Password
- Email Verification
- แสดง Error อย่างปลอดภัย ไม่เปิดเผยข้อมูลเกินจำเป็น

### 9.2 Executive Dashboard

แสดง:

- จำนวนบุคลากรทั้งหมด
- จำนวนรายการอบรมทั้งหมด
- หน่วยงานที่อบรมมากที่สุด
- ประเภทการอบรมยอดนิยม
- แนวโน้มรายเดือน
- แนวโน้มรายปี

### 9.3 Analytics Dashboard

แสดง:

- Training Trend
- Development Trend
- Category Analysis
- Department Analysis
- Monthly Trend
- Yearly Trend
- Individual Development Analysis

### 9.4 Training Records

รองรับ:

- Search
- Filter
- Sort
- Pagination
- ดูรายละเอียดรายการอบรม
- Export CSV/Excel
- เพิ่ม/แก้ไขข้อมูลตามสิทธิ์

### 9.5 Individual Profile

แสดง:

- ข้อมูลบุคลากร
- ประวัติการอบรมทั้งหมด
- ใบประกาศย้อนหลัง
- แนวทางการพัฒนา
- กราฟแนวโน้มรายปี
- Summary รายบุคคล

### 9.6 Self-Service Form

Field:

| Field | Type | Required |
|---|---|---:|
| ชื่อหลักสูตร | Text | Yes |
| ประเภทการอบรม | Dropdown | Yes |
| หมวดย่อย | Dropdown | No |
| หน่วยงานผู้จัด | Text | Yes |
| วันที่อบรม | Date Picker | Yes |
| ปีงบประมาณ | Number | Yes |
| ชื่อใบประกาศ | Text | No |
| ลิงก์ใบประกาศ | URL | No |
| ด้านการพัฒนา | Text/Dropdown | No |
| กลุ่มทักษะ | Text/Dropdown | No |
| แนวทางการพัฒนา | Textarea | No |

### 9.7 Reports

รองรับ:

- รายงานรายบุคคล
- รายงานรายหน่วยงาน
- รายงานรายเดือน
- รายงานรายปี
- Export CSV
- Export Excel

### 9.8 Admin & Security

สำหรับ Super Admin/Admin:

- จัดการผู้ใช้งาน
- จัดการ Role
- จัดการสถานะบัญชี
- จัดการ Department
- จัดการ Category
- ตรวจสอบ Audit Logs
- ตรวจสอบ Login History

---

## 10. Form Validation & Data Validation

### 10.1 Validation Stack

- React Hook Form สำหรับจัดการ Form State
- Zod สำหรับ Schema Validation
- Supabase Constraint สำหรับ Database-level Validation
- RLS สำหรับ Authorization-level Validation

### 10.2 Training Form Validation

ต้องตรวจสอบ:

- ชื่อหลักสูตรต้องไม่ว่าง
- ประเภทการอบรมต้องไม่ว่าง
- หน่วยงานผู้จัดต้องไม่ว่าง
- วันที่อบรมต้องเป็นวันที่ถูกต้อง
- ปีงบประมาณต้องเป็นตัวเลข
- URL ใบประกาศต้องถูกต้อง
- ห้ามข้อมูลซ้ำจาก `user_id + course + date + organizer`
- Personnel ต้องเพิ่มข้อมูลให้ตนเองเท่านั้น

### 10.3 Security Validation

ต้องตรวจสอบ:

- Input Sanitization
- URL Protocol ต้องเป็น `https://` เมื่อเป็นลิงก์ภายนอก
- จำกัดขนาดไฟล์ Upload
- จำกัด MIME Type ของไฟล์
- ไม่แสดง Raw Error จาก Database ต่อผู้ใช้
- Log เหตุการณ์ที่เกี่ยวกับ Security

---

## 11. Search, Filter & Analytics Logic

### 11.1 Search

รองรับ:

- ค้นหาชื่อบุคลากร
- ค้นหาหลักสูตร
- ค้นหาหน่วยงานผู้จัด
- ค้นหาประเภทการอบรม

### 11.2 Filter

รองรับ:

- ปีงบประมาณ
- เดือน
- หน่วยงาน
- ประเภทการอบรม
- บุคลากร
- กลุ่มทักษะ
- ด้านการพัฒนา

### 11.3 Analytics Calculation

ค่าสรุปที่ต้องคำนวณ:

- จำนวนบุคลากรทั้งหมด
- จำนวน Training Records ทั้งหมด
- จำนวนการอบรมรายเดือน
- จำนวนการอบรมรายปี
- Top Courses
- Top Departments
- Top Categories
- Training Count by Person
- Development Trend by Skill Group
- Year-over-Year Comparison

---

## 12. Reporting & Export

### 12.1 Report Types

- รายงานรายบุคคล
- รายงานรายหน่วยงาน
- รายงานรายเดือน
- รายงานรายปี
- รายงานภาพรวมผู้บริหาร

### 12.2 Export Formats

- CSV
- Excel

### 12.3 Export Security

- ตรวจสอบ Role ก่อน Export
- Personnel Export ได้เฉพาะข้อมูลของตนเอง
- HR/Admin/Executive Export ตามสิทธิ์
- บันทึก Audit Log ทุกครั้งที่ Export
- จำกัดข้อมูล Sensitive ที่ไม่จำเป็น

---

## 13. Supabase Storage

### 13.1 Storage Buckets

| Bucket | รายละเอียด | Access |
|---|---|---|
| avatars | รูปโปรไฟล์ | Owner + Admin |
| certificates | ไฟล์ใบประกาศในอนาคต | Owner + HR/Admin/Executive |
| attachments | เอกสารเพิ่มเติม | ตามสิทธิ์ข้อมูลอบรม |

### 13.2 Storage Security

- ใช้ Signed URL สำหรับไฟล์ Private
- จำกัดการ Upload ตาม Role
- จำกัด MIME Type
- จำกัด File Size
- ตั้งชื่อไฟล์แบบไม่เปิดเผยข้อมูลส่วนตัว
- ตรวจสอบสิทธิ์ผ่าน Storage Policies

---

## 14. Audit Logging

### 14.1 Events ที่ต้องเก็บ

- Login สำเร็จ/ไม่สำเร็จ
- Logout
- เพิ่มข้อมูลอบรม
- แก้ไขข้อมูลอบรม
- ลบข้อมูลอบรม
- Export รายงาน
- เปลี่ยน Role
- เปลี่ยนสถานะบัญชี
- Upload File
- ลบ File

### 14.2 Audit Log Metadata

ข้อมูลที่ควรเก็บ:

- Actor
- Action
- Resource Type
- Resource ID
- Timestamp
- IP Address
- User Agent
- Before/After Snapshot เฉพาะกรณีจำเป็น

---

## 15. Security Requirements

### 15.1 OWASP-Aligned Controls

ระบบต้องคำนึงถึง:

- Broken Access Control
- Cryptographic Failures
- Injection
- Insecure Design
- Security Misconfiguration
- Vulnerable and Outdated Components
- Identification and Authentication Failures
- Software and Data Integrity Failures
- Security Logging and Monitoring Failures
- Server-Side Request Forgery Awareness

### 15.2 Frontend Security

- ไม่ฝัง Secret Key ใน Source Code
- ใช้ `.env` และ Vercel Environment Variables
- ใช้ Supabase Anon Key เฉพาะ Client-side
- ไม่ใช้ Service Role Key ใน Browser
- Escape/ sanitize ข้อมูลที่แสดงผล
- ใช้ `rel="noopener noreferrer"` สำหรับ External Links
- Validate ทุก Form ด้วย Zod

### 15.3 Database Security

- เปิด RLS ทุกตารางที่เกี่ยวกับข้อมูลผู้ใช้
- จำกัดสิทธิ์ด้วย Policies
- ใช้ Foreign Key Constraints
- ใช้ Unique Constraints เพื่อกันข้อมูลซ้ำ
- ใช้ Database Index สำหรับ Query สำคัญ
- Backup Database

### 15.4 Operational Security

- แยก Environment: Development, Staging, Production
- ตั้งค่า Vercel Environment Variables แยกตาม Environment
- จำกัดสิทธิ์ Supabase Project
- ตรวจสอบ Dependency Vulnerabilities
- ใช้ GitHub Branch Protection
- ทำ Backup และ Recovery Plan

---

## 16. Responsive Design Requirements

### 16.1 Breakpoints

| Device | Width |
|---|---:|
| Mobile | < 640px |
| Tablet | 640px - 1023px |
| Desktop | >= 1024px |

### 16.2 UX Guidelines

- Mobile-first Design
- ตารางข้อมูลรองรับ Horizontal Scroll
- Filter บน Mobile ควรเป็น Drawer หรือ Sheet
- Sidebar บน Mobile ควรเปลี่ยนเป็น Hamburger หรือ Bottom Navigation
- Chart ต้อง Responsive
- Form ต้องใช้งานง่ายบนมือถือ
- Text ต้องไม่ล้นหรือทับกัน
- Action สำคัญต้องมองเห็นชัดเจน

---

## 17. Suggested Project Structure

```text
ptdms/
  src/
    app/
      router.tsx
      providers.tsx
    components/
      charts/
      forms/
      layout/
      tables/
      ui/
    features/
      auth/
      dashboard/
      analytics/
      personnel/
      training-records/
      reports/
      admin/
    lib/
      supabase.ts
      env.ts
    services/
      auth.service.ts
      training.service.ts
      profile.service.ts
      report.service.ts
      audit.service.ts
    stores/
      auth.store.ts
      filter.store.ts
    types/
      database.types.ts
      roles.ts
    utils/
      analytics.ts
      date.ts
      export.ts
      format.ts
      validation.ts
    main.tsx
  supabase/
    migrations/
    seed.sql
    policies/
  public/
  .env.example
  package.json
  README.md
```

---

## 18. Environment Variables

### 18.1 Frontend Environment

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 18.2 Important Rule

- `VITE_SUPABASE_ANON_KEY` ใช้ใน Frontend ได้ แต่ต้องมี RLS คุมสิทธิ์
- ห้ามใส่ `SUPABASE_SERVICE_ROLE_KEY` ใน Frontend
- Service Role Key ใช้เฉพาะ Server-side, Edge Functions หรือระบบ Admin ที่ปลอดภัยเท่านั้น

---

## 19. Development Phases

### Phase 0: Setup Supabase + Database Schema

เป้าหมาย: เตรียมฐานข้อมูลและโครงสร้างระบบหลัก

งานที่ต้องทำ:

- สร้าง Supabase Project
- สร้าง PostgreSQL Schema
- สร้างตาราง `profiles`, `training_records`, `certificates`, `development_analysis`
- สร้างตาราง `departments`, `course_categories`
- สร้างตาราง `audit_logs`, `login_history`
- เปิด RLS ทุกตารางที่จำเป็น
- สร้าง Policies เบื้องต้น
- เตรียม Seed Data
- สร้าง React + TypeScript + Vite Project
- ติดตั้ง Tailwind CSS
- ตั้งค่า GitHub Repository

ผลลัพธ์:

- Database พร้อมใช้งาน
- Supabase Auth พร้อมตั้งค่า
- Frontend Project พร้อมพัฒนา

### Phase 1: Authentication + RBAC

เป้าหมาย: ทำระบบ Login และสิทธิ์ผู้ใช้ระดับ Production

งานที่ต้องทำ:

- สร้าง Login Page
- สร้าง Register หรือ Invite Flow
- สร้าง Forgot Password / Reset Password
- เปิด Email Verification
- โหลด Profile และ Role หลัง Login
- สร้าง Auth Store ด้วย Zustand
- สร้าง Protected Routes
- จำกัดเมนูตาม Role
- จำกัดข้อมูลตาม RLS

ผลลัพธ์:

- ผู้ใช้ Login/Logout ได้
- ระบบจำกัด Route ตาม Role
- Session ทำงานถูกต้อง

### Phase 2: Dashboard + Search + Filter

เป้าหมาย: แสดงข้อมูลภาพรวมองค์กรและค้นหาข้อมูลได้

งานที่ต้องทำ:

- สร้าง Executive Dashboard
- สร้าง Summary Cards
- ดึงข้อมูลจาก Supabase
- สร้าง Training Records Table
- เพิ่ม Search
- เพิ่ม Filter เดือน ปี หน่วยงาน ประเภท
- เพิ่ม Bar Chart และ Line Chart
- ทำ Responsive Dashboard

ผลลัพธ์:

- Dashboard แสดงข้อมูลภาพรวมได้
- Search/Filter ทำงานได้
- Chart แสดงผลได้

### Phase 3: Individual Profile

เป้าหมาย: ดูข้อมูลการอบรมรายบุคคล

งานที่ต้องทำ:

- สร้างหน้า Personnel List
- สร้าง Individual Profile Page
- แสดงประวัติการอบรม
- แสดงใบประกาศย้อนหลัง
- แสดงแนวทางการพัฒนา
- แสดงกราฟแนวโน้มรายปี
- จำกัด Personnel ให้เห็นเฉพาะข้อมูลตนเอง

ผลลัพธ์:

- ดูข้อมูลรายบุคคลได้
- เห็นประวัติและใบประกาศย้อนหลัง
- Personnel เห็นข้อมูลของตนเองเท่านั้น

### Phase 4: Self-Service Form

เป้าหมาย: ให้บุคลากรเพิ่มและแก้ไขข้อมูลของตนเอง

งานที่ต้องทำ:

- สร้าง Self-Service Form
- ใช้ React Hook Form + Zod
- Validate ข้อมูลก่อนส่ง
- ตรวจสอบข้อมูลซ้ำ
- บันทึกข้อมูลลง Supabase
- เพิ่ม/แก้ไข Certificate Link
- เขียน Audit Log เมื่อสร้าง/แก้ไข
- ทดสอบ RLS สำหรับ Personnel

ผลลัพธ์:

- Personnel เพิ่มข้อมูลอบรมเองได้
- Personnel แก้ไขข้อมูลตนเองได้
- ข้อมูลแสดงใน Dashboard/Profile

### Phase 5: Analytics + Reports

เป้าหมาย: วิเคราะห์ข้อมูลและ Export รายงาน

งานที่ต้องทำ:

- สร้าง Analytics Dashboard
- สร้าง Training Trend
- สร้าง Development Trend
- สร้าง Category Analysis
- สร้าง Department Analysis
- สร้าง Monthly/Yearly Trend
- สร้าง Export CSV
- สร้าง Export Excel
- บันทึก Audit Log เมื่อ Export

ผลลัพธ์:

- วิเคราะห์ข้อมูลได้หลายมิติ
- Export รายงานได้ตาม Role
- ผู้บริหารใช้ข้อมูลประกอบการตัดสินใจได้

### Phase 6: Audit Logs + Advanced Security

เป้าหมาย: เพิ่มความพร้อมด้าน Security และ Compliance

งานที่ต้องทำ:

- สร้าง Audit Logs Page
- สร้าง Login History
- เพิ่ม Security Events
- ตรวจสอบ RLS ทุก Policy
- ทดสอบ Access Control ทุก Role
- ตั้งค่า Storage Policies
- ทำ Backup Plan
- ตรวจ Dependency Security

ผลลัพธ์:

- ตรวจสอบย้อนหลังได้
- ระบบปลอดภัยขึ้น
- พร้อมใช้งาน Production มากขึ้น

### Phase 7: AI Recommendation

เป้าหมาย: รองรับการวิเคราะห์เชิงแนะนำในอนาคต

งานที่ต้องทำ:

- วิเคราะห์ Skill Gap
- แนะนำหลักสูตรตามประวัติ
- แนะนำแนวทางพัฒนารายบุคคล
- แนะนำแผนพัฒนารายหน่วยงาน
- สร้าง Executive Insight Summary

ผลลัพธ์:

- ระบบต่อยอดเป็น HR Analytics Platform
- สนับสนุนการตัดสินใจเชิงกลยุทธ์

---

## 20. Testing Plan

### 20.1 Functional Testing

- Register/Login/Logout ทำงานถูกต้อง
- Forgot Password/Reset Password ทำงานถูกต้อง
- Email Verification ทำงานถูกต้อง
- Role แต่ละประเภทเห็นเมนูถูกต้อง
- Dashboard แสดงข้อมูลถูกต้อง
- Search/Filter ทำงานถูกต้อง
- เพิ่ม/แก้ไขข้อมูลอบรมได้
- Personnel แก้ไขได้เฉพาะข้อมูลตนเอง
- Export CSV/Excel ได้

### 20.2 Security Testing

- ทดสอบ RLS ทุก Role
- ทดสอบการเข้าถึงข้อมูลข้ามผู้ใช้
- ทดสอบการแก้ไขข้อมูลที่ไม่มีสิทธิ์
- ทดสอบ URL ที่ไม่ถูกต้อง
- ทดสอบข้อมูลซ้ำ
- ทดสอบ Storage Access
- ตรวจสอบว่าไม่มี Service Role Key ใน Frontend

### 20.3 Responsive Testing

ทดสอบบน:

- Desktop 1440px
- Laptop 1024px
- Tablet 768px
- Mobile 375px

ตรวจสอบ:

- ตารางไม่ล้นหน้าจอ
- Chart ปรับขนาดถูกต้อง
- Form ใช้งานบนมือถือได้
- Navigation ใช้งานได้ทุกขนาดหน้าจอ
- Text ไม่ทับกัน

### 20.4 Production Testing

- ทดสอบ Production Build
- ทดสอบ Environment Variables บน Vercel
- ทดสอบ Supabase Auth Redirect URL
- ทดสอบ HTTPS
- ทดสอบ Performance เบื้องต้น
- ทดสอบ Error Handling

---

## 21. Deployment Plan

### 21.1 GitHub

- สร้าง Repository
- ใช้ Branch Strategy เช่น `main`, `develop`, `feature/*`
- เปิด Pull Request Review
- เปิด Branch Protection สำหรับ `main`
- ตรวจสอบ `.env` ไม่ถูก Commit

### 21.2 Supabase

- สร้าง Supabase Project
- ตั้งค่า Authentication
- ตั้งค่า Email Templates
- สร้าง Database Schema
- เปิด RLS
- สร้าง Policies
- ตั้งค่า Storage Buckets
- ตั้งค่า Backup

### 21.3 Vercel

- เชื่อม GitHub Repository
- ตั้งค่า Environment Variables
- ตั้งค่า Build Command
- Deploy Preview สำหรับ Pull Request
- Deploy Production จาก `main`
- ตั้งค่า Custom Domain ถ้ามี

### 21.4 Production Checklist

- RLS เปิดครบทุกตารางสำคัญ
- Policies ทดสอบครบทุก Role
- Environment Variables ถูกต้อง
- ไม่มี Secret ใน Repository
- Auth Redirect URL ถูกต้อง
- HTTPS ทำงาน
- Backup พร้อม
- Audit Logs พร้อม
- Error State ใน UI พร้อม

---

## 22. Deliverables

### 22.1 เอกสาร

- Development Plan
- Database Schema
- RBAC Matrix
- RLS Policy Specification
- Security Checklist
- Deployment Guide
- User Manual

### 22.2 ระบบ

- React + TypeScript Web Application
- Supabase Auth
- Supabase PostgreSQL Database
- Supabase Storage
- Executive Dashboard
- Analytics Dashboard
- Individual Profile
- Self-Service Form
- Reports
- Audit Logs

---

## 23. Acceptance Criteria

ระบบถือว่าส่งมอบได้เมื่อ:

- ผู้ใช้ Register/Login/Logout ได้
- Forgot Password และ Reset Password ใช้งานได้
- Email Verification ทำงานได้
- Session Management ถูกต้อง
- Super Admin, Admin, Executive, HR และ Personnel เห็นข้อมูลตามสิทธิ์
- RLS จำกัดข้อมูลถูกต้อง
- Dashboard แสดงข้อมูลภาพรวมถูกต้อง
- Search, Filter, Sort และ Pagination ทำงานได้
- ดูประวัติการอบรมรายบุคคลได้
- เปิดลิงก์ใบประกาศย้อนหลังได้
- บุคลากรเพิ่มข้อมูลการอบรมของตนเองได้
- บุคลากรแก้ไขข้อมูลของตนเองได้
- HR/Admin จัดการข้อมูลตามสิทธิ์ได้
- Export CSV/Excel ได้ตาม Role
- Audit Logs บันทึกเหตุการณ์สำคัญได้
- Analytics รายเดือน/รายปีแสดงผลถูกต้อง
- ใช้งานได้ดีบน Desktop, Tablet และ Mobile
- Deploy บน Vercel และใช้งานผ่าน HTTPS ได้
- ไม่มี Secret Key หลุดใน Frontend หรือ Repository

---

## 24. Future Enhancement

- AI Recommendation
- Skill Gap Analysis
- Advanced HR Analytics
- Executive Insight Summary
- PDF Report Generator
- Notification System
- Approval Workflow สำหรับข้อมูลที่ Personnel เพิ่มเอง
- Integration กับระบบ HR ภายใน
- SSO / Google Workspace Login
- Department Benchmarking
- Training Plan Management
- Competency Framework

---

## 25. สรุป

PTDMS เวอร์ชันใหม่นี้ออกแบบเป็นระบบระดับ Enterprise และ Production Ready โดยเปลี่ยนฐานสถาปัตยกรรมเป็น **React + TypeScript + Vercel + Supabase** ใช้ **Supabase Auth** สำหรับ Authentication, **PostgreSQL** สำหรับฐานข้อมูล, **Row Level Security** สำหรับควบคุมสิทธิ์ข้อมูล, **Supabase Storage** สำหรับรองรับไฟล์ และใช้แนวทาง **OWASP Security Best Practices** เพื่อให้ระบบปลอดภัย ขยายต่อได้ และพร้อมพัฒนาเป็น HR Analytics Platform ในอนาคต

