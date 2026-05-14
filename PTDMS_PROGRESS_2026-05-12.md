# PTDMS Progress Update - 2026-05-12

เอกสารนี้สรุปงานที่ดำเนินการในวันนี้แบบแยกไฟล์ เพื่อใช้ส่งต่องานรอบถัดไป

## Scope วันนี้

- ปรับปรุงหน้า Analytics ให้ใช้งานง่ายขึ้นทั้ง desktop/mobile
- ปรับปรุงหน้า Dashboard สำหรับผู้บริหารให้ลดความรก
- ปรับคำแสดงผลจาก `count` เป็น `จำนวน` ในหลายหน้าหลัก
- ปรับตรรกะไม่ให้นำ `super_admin` ไปนับในงานวิเคราะห์/สถิติ

## What Was Done Today

### 1) Analytics & Insights

- ปรับ `Development Areas` ให้รองรับการใช้งานจริง
  - เพิ่ม filter `Work Group` และ `Year`
  - เพิ่ม drill-down: คลิกแท่งแล้วแสดงรายชื่อบุคลากร
  - เพิ่มการ highlight แท่งที่เลือก
  - เอา `Department` ออกจาก filter ตามบริบทใช้งานจริง

- ปรับ Pie section `สัดส่วนตามประเภทการอบรม`
  - แก้ปัญหา label ซ้อน/ล้นกรอบหลายรอบ
  - เพิ่มมุมมองรายการ 5 หมวดด้านขวาบนจอใหญ่
  - ปิด callout/เส้นบน pie ตามคำขอล่าสุด (เหลือกราฟ + รายการด้านขวา)
  - คง responsive behavior บนจอเล็ก

- เปลี่ยนคำแสดงผลใน tooltip จาก `count` เป็น `จำนวน`
  - ประเภทการอบรม
  - แนวโน้มรายเดือน
  - กลุ่มงาน

### 2) Executive Dashboard

- ปรับ section `Training Portfolio by Category`
  - แก้ animation แท่งไม่ตรงแถว โดยเอา custom shape ออกและใช้ `Cell`
  - ปรับแอนิเมชันให้ลื่นขึ้นและเริ่มหลังข้อมูลนิ่ง
  - ซ่อนชื่อแกนซ้ายในกราฟตามคำขอ
  - ปรับครั้งล่าสุดให้เหลือเฉพาะ “การ์ดลิสต์รายละเอียด” (ตัดกราฟซ้ายออก) เพื่อลดความรก

- เปลี่ยนคำแสดงผลใน tooltip จาก `count` เป็น `จำนวน`
  - Monthly Trend
  - Yearly Trend

### 3) Recommendations

- ตัด `super_admin` ออกจากการวิเคราะห์ทั้งหมดในหน้า Recommendations
  - skill gaps
  - course recommendations
  - work group plans
  - executive insights

### 4) Super Admin Exclusion (Analytics/Dashboard)

- กรอง `super_admin` ออกจากการนับสถิติใน:
  - Dashboard summary
  - Analytics summary/charts
- ยืนยันว่าเป็นการตัดออกเฉพาะ “การนับเชิงวิเคราะห์” ไม่กระทบสิทธิ์เข้าใช้งาน

### 5) Course Directory

- ปรับ UX ให้ไม่ลายตา
  - แสดง Top 5 หมวดหลักเป็นค่าเริ่มต้น
  - มีปุ่มสลับดูทั้งหมด
  - รองรับ accordion เปิด/ปิดรายหมวด
  - คง drawer รายชื่อผู้เรียนเดิม

## Files Touched (Today)

- `src/features/analytics/AnalyticsPage.tsx`
- `src/services/analytics.service.ts`
- `src/services/dashboard.service.ts`
- `src/services/recommendation.service.ts`
- `src/features/dashboard/DashboardPage.tsx`
- `src/features/courses/CourseListPage.tsx`
- `src/features/personnel/components/IndividualProfileView.tsx`
- `PTDMS_PROGRESS.md`

## Verification

- รัน `npm run build` ผ่านทุกชุดงานหลักหลังแก้ไข
- ไม่มีการแก้ schema ฐานข้อมูลในรอบนี้

## Open Notes

- หน้า Analytics (Pie) ปัจจุบันเน้นอ่านง่าย: ไม่มี callout line แล้ว ใช้รายการ 5 หมวดด้านขวาแทน
- หน้า Dashboard (Portfolio) ปัจจุบันเหลือการ์ดลิสต์อย่างเดียวตามคำสั่งล่าสุด

## Next Suggested Actions

1. ทดสอบ UI จริงบนจอเล็ก/จอใหญ่ (Analytics + Dashboard)
2. สรุปข้อความภาษาไทยให้ครบทั้งระบบ (label/tooltip/header)
3. เริ่มออกแบบหน้า `Required Learning Rules` ให้ Super Admin/Admin ตั้งหลักสูตรบังคับได้เอง

