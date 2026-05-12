# PTDMS Progress Update - 2026-05-11

เอกสารนี้เป็น progress summary ฉบับใหม่สำหรับส่งต่อ AI รอบถัดไป
โดยแยกจาก `PTDMS_PROGRESS_20260508.md` เพื่อไม่ทับกับของเดิม

## Current State

- Phase 9 ยังดำเนินต่อในส่วน feature enhancements
- Audit Logs/User Activity Logging ยังคง deferred ไว้ขั้นตอนสุดท้าย
- ระบบ build ผ่านแล้วหลังปรับฟีเจอร์ทั้งหมดในวันนี้

## What Was Done Today

### 1. Course Directory

- สร้างหน้า `Course Directory`
- จำกัดการมองเห็นเฉพาะ `Super Admin`, `Admin`, `Executive`, `HR`
- แสดงหลักสูตรแยกตามหมวดหมู่จาก `course_categories`
- เปิด drawer แสดงรายชื่อผู้เรียนของแต่ละหลักสูตร
- จัดเรียงผู้เรียนตามวันที่อบรมล่าสุด

### 2. Self-Service Field Alignment

- ปรับ schema ของ Self-Service ให้ใช้ field ใหม่
  - `trainingType`
  - `courseName`
- เพิ่มตัวเลือก `ประเภทหลักสูตร` 5 รายการในฟอร์ม
- ปรับ service layer ให้ map ค่ากลับไปยังตารางเดิมใน Supabase
  - `trainingType` -> `training_records.category`
  - `courseName` -> `training_records.course`
- ปรับ edit flow ใน `Training Records` และ `Individual Profile` ให้รองรับ field ใหม่

### 3. Training Records Table

- เพิ่มคอลัมน์ `ประเภทหลักสูตร` ถัดจาก `บุคลากร`
- เอาคอลัมน์ `ประเภท` ที่ซ้ำออกจากตารางแล้ว
- ยังคงใช้ข้อมูลจริงจาก `training_records.category`

### 4. Executive Dashboard

- เพิ่ม section ใหม่สำหรับภาพรวม 5 หมวดหลักสูตร
- แสดงเป็น horizontal bar chart + summary cards
- ปรับสัดส่วนกราฟให้ยืดสูงขึ้นและอ่านง่ายขึ้น
- แก้ runtime issue จาก `Cell` ใน Recharts
- ลดพื้นที่ว่างด้านบน/ล่างของกราฟให้สมดุลกับการ์ดด้านขวา

## Files Changed Today

- `src/features/courses/CourseListPage.tsx`
- `src/services/course.service.ts`
- `src/app/router.tsx`
- `src/components/layout/AppLayout.tsx`
- `src/features/self-service/training-form.schema.ts`
- `src/components/training/TrainingForm.tsx`
- `src/services/training.service.ts`
- `src/features/self-service/SelfServicePage.tsx`
- `src/features/training-records/TrainingRecordsPage.tsx`
- `src/features/personnel/components/IndividualProfileView.tsx`
- `src/services/dashboard.service.ts`
- `src/features/dashboard/DashboardPage.tsx`
- `PTDMS_AI_DEVELOPMENT_TRACKER.md`

## Verification

- `npm run build` ผ่านแล้ว
- พบและแก้ runtime issue ของ Dashboard chart แล้ว

## Known Notes

- ยังไม่ต้องเพิ่มคอลัมน์ใหม่ใน Supabase สำหรับ `trainingType`
- ระบบใช้ field เดิมในฐานข้อมูล แต่เปลี่ยนชื่อ/ความหมายใน UI และ schema ให้ตรงกัน
- ข้อมูลเก่าที่ยังไม่ตรง 5 หมวดใหม่อาจต้องมีการ map หรือปรับข้อมูลภายหลัง

## Next Recommended Actions

1. ทดสอบ `Executive Dashboard` บน browser จริงว่ากราฟและ layout อยู่ตำแหน่งสวยงาม
2. ทดสอบ `Course Directory` กับ role ที่กำหนด
3. ทดสอบ create/edit flow ของ Self-Service ด้วย field ใหม่
4. ถ้าจำเป็น ค่อยทำ data cleanup/mapping สำหรับค่าหมวดหลักสูตรเก่าใน Supabase

## Handoff

ถ้า AI รอบถัดไปต้องเริ่มต่อ ให้เปิดอ่านตามลำดับนี้:

1. `PTDMS_PROGRESS.md`
2. `PTDMS_AI_DEVELOPMENT_TRACKER.md`
3. `PTDMS_DEVELOPMENT_PLAN.md`

## Git Commands (Ready to Use)

```bash
git status
git add src/features/analytics/AnalyticsPage.tsx src/services/analytics.service.ts src/services/dashboard.service.ts PTDMS_PROGRESS.md
git commit -m "update: improve analytics development areas and exclude super admin from statistics"
git push origin main
```
