# PTDMS Development Progress Summary (2026-05-08)

ไฟล์นี้สรุปการเปลี่ยนแปลงและฟีเจอร์ที่พัฒนาเพิ่มเติมในวันที่ 8 พฤษภาคม 2026 เพื่อใช้เป็นบริบทสำหรับการพัฒนาต่อยอด

## 1. ฟีเจอร์ที่เพิ่ม/แก้ไข (Key Features)

### 🟢 ระบบอนุมัติผู้ใช้งานใหม่ (Admin Approval Workflow)
- **Status 'Pending'**: เพิ่มสถานะ `pending` สำหรับผู้สมัครใหม่ โดยผู้สมัครจะยังเข้าใช้งานระบบไม่ได้จนกว่าจะได้รับการอนุมัติ
- **Access Control**: ปรับปรุง `ProtectedRoute` ให้ตรวจเช็คสถานะบัญชี หากเป็น `pending` จะถูกส่งไปหน้าแจ้งเตือนโดยอัตโนมัติ
- **UI ใหม่**: สร้างหน้า `PendingApprovalPage.tsx` เพื่อแสดงข้อความแจ้งเตือนผู้ใช้ที่รอการอนุมัติ

### 🟢 ระบบจัดการผู้ใช้ (User Management)
- **Role/Status Update**: Admin สามารถเปลี่ยน Role และสถานะ (Active/Inactive/Pending) ของผู้ใช้ได้
- **Delete User**: เพิ่มปุ่มลบผู้ใช้งาน (เฉพาะ **Super Admin** เท่านั้น)
- **Confirm Modal**: สร้าง `ConfirmModal.tsx` แบบพรีเมียมมาใช้แทน window.confirm แบบเดิมเพื่อให้หน้าตาสวยงามและปลอดภัย

### 🟢 การปรับปรุงข้อมูลส่วนตัว (Profile Enhancements)
- **ฟิลด์ "กลุ่มงาน" (Work Group)**: เพิ่มฟิลด์ "กลุ่มงาน" เข้าไปในฐานข้อมูลและหน้าแก้ไขโปรไฟล์
- **แก้ไขตำแหน่งได้เอง**: อนุญาตให้บุคลากรแก้ไข ตำแหน่ง, หน่วยงาน และกลุ่มงาน ได้ด้วยตนเองผ่านหน้า My Profile
- **Clean UI**: นำ "รหัสพนักงาน" (Employee Code) ออกจากหน้าโปรไฟล์ตามความต้องการ

### 🟢 แดชบอร์ดผู้บริหาร (Executive Dashboard & Analytics)
- **เปลี่ยนหน่วยวัด**: เปลี่ยนการสรุปผลจากราย "หน่วยงาน" (Department) เป็นราย **"กลุ่มงาน" (Work Group)** ทั้งในหน้า Dashboard แรก และหน้า Analytics
- **Empty State**: เพิ่มระบบตรวจสอบข้อมูล หากไม่มีข้อมูลในกลุ่มงานนั้นๆ กราฟจะแสดงสถานะ "ไม่มีข้อมูล" แทนการแสดงหน้าจอว่างเปล่า

---

## 2. สิ่งที่ต้องทำใน Supabase (Database Setup)

**สำคัญ:** เนื่องจากยังไม่ได้ Push ขึ้น GitHub/Vercel หากมีการเปลี่ยน Database ต้องรัน SQL ต่อไปนี้ใน SQL Editor:

```sql
-- 1. เพิ่มฟิลด์ กลุ่มงาน
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_group text;

-- 2. เพิ่มสถานะ pending ใน Enum
ALTER TYPE public.profile_status ADD VALUE IF NOT EXISTS 'pending';

-- 3. ปรับฟังก์ชันสมัครใหม่ให้เป็น pending โดยอัตโนมัติ
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role, status)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), ''),
    public.safe_user_role(new.raw_user_meta_data ->> 'role'),
    'pending'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ฟังก์ชันสำหรับการลบผู้ใช้ (เฉพาะ Super Admin)
CREATE OR REPLACE FUNCTION public.delete_user(target_user_id uuid)
RETURNS void AS $$
BEGIN
  IF (SELECT role FROM public.profiles WHERE user_id = auth.uid()) != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**การตั้งค่า Auth:**
- ต้องเข้าไปที่ **Authentication -> Providers -> Email** และ **ปิด (Off)** หัวข้อ `Confirm email` เพื่อให้ใช้ระบบ Admin Approval แทน

---

## 3. ขั้นตอนถัดไป (Next Steps)
1. **GitHub/Vercel Deployment**: นำ Code ล่าสุดขึ้นระบบ (โปรเจกต์ Build ผ่านเรียบร้อยแล้วด้วยคำสั่ง `npm run build`)
2. **Data Cleansing**: ตรวจสอบข้อมูลบุคลากรเดิมให้ระบุ "กลุ่มงาน" ให้ครบ เพื่อให้กราฟแสดงผลได้สวยงาม
---

# PTDMS Development Progress Summary (2026-05-11)

สรุปการอัปเดตระบบประจำวันที่ 11 พฤษภาคม 2026 โดยเน้นที่ความคล่องตัวในการจัดการข้อมูลการอบรมและประสิทธิภาพของระบบ

## 1. ฟีเจอร์ที่เพิ่ม/แก้ไข (Key Features)

### 🟢 ระบบจัดการการอบรมในหน้าโปรไฟล์ (Personnel Profile Management)
- **Direct Management**: HR/Admin และเจ้าของโปรไฟล์สามารถ **เพิ่ม (Add)**, **แก้ไข (Edit)** และ **ลบ (Delete)** ข้อมูลการอบรมได้โดยตรงจากหน้าโปรไฟล์บุคลากรรายบุคคล
- **Dynamic Form**: ฟอร์มแก้ไขจะดึงข้อมูลเดิมมาแสดงอัตโนมัติ (Course, Date, Certificate, Analysis) เพื่อให้ง่ายต่อการปรับปรุงข้อมูล
- **Smart Logic**: เปลี่ยนระบบบันทึกข้อมูลจาก `upsert` เป็น `Select-Update-Insert` เพื่อความแม่นยำ 100% ป้องกันปัญหาข้อมูลไม่ถูกทับหรือข้อมูลซ้ำซ้อน

### 🟢 การปรับปรุงประสิทธิภาพ (Performance Optimization)
- **Parallel Fetching**: เปลี่ยนการโหลดข้อมูลหน้าโปรไฟล์จากการรอทีละชุด (Waterfall) เป็นการโหลดแบบขนานด้วย `Promise.all`
- **Single SQL Query**: ใช้เทคนิคการ Join ตารางในระดับ Database เพื่อดึงข้อมูลประวัติการอบรมพร้อมใบประกาศและผลวิเคราะห์ในการเรียกใช้ API เพียงครั้งเดียว
- **ผลลัพธ์**: หน้าจอโปรไฟล์โหลดข้อมูลได้รวดเร็วขึ้นอย่างเห็นได้ชัด (ลด Latency จาก 4 รอบเหลือ 1-2 รอบ)

### 🟢 การจัดการใบประกาศ (Certificate Links)
- **Real URL Linking**: แก้ไขลิงก์ "ดูใบประกาศ" ให้เชื่อมโยงไปยัง URL จริงที่กรอกไว้ และเปิดในหน้าต่างใหม่ (Tab) 
- **Graceful Fallback**: หากไม่มีลิงก์ ระบบจะยังแสดงผลเป็นสีน้ำเงินตามดีไซน์เดิมแต่จะไม่มีไอคอนเปิดหน้าต่างใหม่ เพื่อให้ UI คงความสวยงามและไม่สับสน
- **Link Auto-detection**: ปรับปรุงให้ระบบตรวจสอบ URL ได้แม่นยำขึ้น

### 🟢 ความเสถียรของระบบ (System Stability)
- **React Router v7 Support**: เปิดใช้งาน Future Flags ทั้งหมดใน `router.tsx` และ `main.tsx` เพื่อกำจัด Console Warning และเตรียมพร้อมสำหรับการอัปเกรด
- **Self-Service Fix**: แก้ไขอาการ "ค้าง" ในหน้า Self-Service โดยการเพิ่มสถานะ Loading และระบบจัดการ Error ที่สมบูรณ์
- **Duplicate Clean-up**: ทำความสะอาดข้อมูลขยะในฐานข้อมูลและเตรียมโครงสร้างสำหรับ Unique Constraints

## 2. สิ่งที่ต้องทำต่อ (Next Steps)
1. **GitHub Sync**: นำ Code ล่าสุดขึ้นระบบเพื่อสำรองข้อมูล
2. **User Testing**: ให้กลุ่มตัวอย่างทดลองแก้ไขข้อมูลการอบรมเพื่อตรวจสอบความถูกต้องของ Flow อีกครั้ง
3. **Phase 9 Planning**: เริ่มศึกษาแนวทางการนำ AI มาใช้ในการแนะนำหลักสูตร (Future Enhancement)

---

# PTDMS Development Progress Update (2026-05-11 Phase 9)

สรุปการต่อยอด Phase 9 รอบล่าสุด โดยเริ่มจากระบบ Recommendation ที่ใช้งานได้ทันทีจากข้อมูลใน Supabase เดิม ยังไม่ต้องเพิ่ม API key หรือ migration ใหม่

## 1. ฟีเจอร์ที่เพิ่ม/แก้ไข (Key Features)

### 🟢 AI Recommendations Page
- **หน้าใหม่ `/recommendations`**: เพิ่มเมนู Recommendations สำหรับ Super Admin, Admin, Executive และ HR
- **Executive Insight Summary**: สรุป Training Coverage, Skill Gap Watch, Strategic Focus และ Work Group Balance
- **Skill Gap Recommendations**: วิเคราะห์บุคลากรแต่ละคนจากประวัติอบรมและทักษะเป้าหมาย พร้อมจัดลำดับความสำคัญเป็น เร่งด่วน / ควรวางแผน / ต่อยอด
- **Recommended Course Portfolio**: แนะนำหลักสูตรจากข้อมูลหลักสูตรที่เคยอบรมและ skill group ที่เกี่ยวข้อง
- **Work Group Development Plan**: สรุปแผนพัฒนารายกลุ่มงานตามค่าเฉลี่ยการอบรมและ gap ของทักษะเป้าหมาย

### 🟢 Recommendation Engine
- เพิ่ม `src/services/recommendation.service.ts` เพื่อดึงข้อมูลจาก `profiles`, `training_records` และ `development_analysis`
- ใช้ rule-based analytics เพื่อคำนวณ skill gap, target skill groups, suggested courses และ executive insights
- ใช้ข้อมูล `status = active` เป็นฐานในการวิเคราะห์บุคลากรที่ยังปฏิบัติงานอยู่

### 🟢 Routing & Stability
- เพิ่ม route `/recommendations` ใน `src/app/router.tsx`
- เพิ่มเมนู Recommendations ใน `src/components/layout/AppLayout.tsx`
- แก้ `v7_startTransition` ให้อยู่ที่ `RouterProvider` ใน `main.tsx` เท่านั้น เพื่อให้ TypeScript build ผ่านกับ React Router เวอร์ชันปัจจุบัน

### 🟢 Super Admin Personnel Visibility
- **เห็นบุคลากรทุกคน**: ปรับ `listPersonnel` ให้ดึง `profiles` ทั้งหมดที่ RLS อนุญาต โดยไม่กรองเฉพาะ Active
- **สถิติแม่นยำขึ้น**: เปลี่ยนจาก embedded count เป็นการดึง `training_records` แยก แล้วคำนวณจำนวนอบรมทั้งหมด, จำนวนอบรมปีงบประมาณนี้, วันที่อบรมล่าสุด และหมวด/หลักสูตรเด่นต่อคน
- **Summary Cards**: หน้า Personnel List มีสรุปบุคลากรทั้งหมด, บัญชี Active, การอบรมทั้งหมด และการอบรมปีงบประมาณนี้
- **Search ครอบคลุมขึ้น**: ค้นหาได้จากชื่อ, รหัส, หน่วยงาน, กลุ่มงาน, ตำแหน่ง, role และ status

### 🟡 Audit Logs Deferred
- **พักไว้ขั้นตอนสุดท้าย**: ถอดหน้า Audit Logs, route `/admin/audit-logs` และเมนู Audit Logs ออกจากระบบปัจจุบัน
- **หยุดการบันทึกชั่วคราว**: ถอดการ insert `audit_logs` จาก flow เพิ่ม/แก้ไข/ลบข้อมูลอบรม และ flow จัดการผู้ใช้
- **คง schema เดิมไว้**: ยังไม่ลบ migration/table เดิม เพื่อให้เปิดกลับมาใช้งานในช่วงสุดท้ายได้โดยไม่ต้องรื้อฐานข้อมูล
- **Security Page**: ถอดข้อความที่ระบุว่า Audit logging เปิดใช้งานอยู่ เพื่อไม่ให้ผู้ใช้สับสน

## 2. การตรวจสอบ (Verification)
1. `npm run build` ผ่านหลัง rerun แบบ escalated เพราะ esbuild ถูก sandbox บล็อกด้วย `spawn EPERM`
2. เปิด Vite dev server สำเร็จที่ `http://127.0.0.1:5174/`
3. `npm run build` ผ่านหลังปรับหน้า Personnel List
4. `npm run build` ผ่านหลังถอด Audit Logs ออกจาก flow ปัจจุบัน

## 3. สิ่งที่ต้องทำต่อ (Next Steps)
1. ทดสอบหน้า Recommendations ด้วยบัญชี HR/Admin/Executive และข้อมูลจริง
2. ทดสอบหน้า Personnel List ด้วยบัญชี Super Admin เพื่อยืนยันว่าเห็นทุก status และตัวเลขตรงฐานข้อมูล
3. ทดสอบ flow เพิ่ม/แก้ไข/ลบข้อมูลอบรม และจัดการ role/status ผู้ใช้ หลังถอด audit writes
4. ปรับน้ำหนักกฎ recommendation จาก feedback ของผู้ใช้จริง
5. ทำ Export/PDF สำหรับ Executive Insight Summary
6. ออกแบบ Approval Workflow สำหรับแผนพัฒนารายบุคคลหรือรายกลุ่มงาน
7. กลับมาเปิด Audit Logs/User Activity Logging ในขั้นตอนสุดท้าย

---
