# แผนพัฒนาและเชื่อมต่อระบบ Centralized SSO สำหรับ PTDMS

เอกสารนี้แยกเฉพาะแผน SSO เพื่อให้อ่านง่ายและลดการใช้ token เวลาให้ AI อ่านบริบท

Architecture Context: React + TypeScript + Supabase + Zustand + RBAC

---

## 1. IPO Framework: Centralized SSO

### 1.1 I - Input (ข้อมูลและส่วนประกอบขาเข้า)

- `User Action`: ผู้ใช้กดปุ่ม `Login with SSO` จากหน้า `LoginPage.tsx`
- `Provider Data`: ข้อมูลบัญชีที่ผู้ใช้กรอกในหน้าของ Identity Provider กลาง (เช่น Google, Microsoft หรือ SSO หน่วยงาน)
- `System Configuration`:
- `Redirect URL` ที่ตั้งค่าใน Supabase Auth เช่น `http://127.0.0.1:5173/auth/callback`
- `OAuth Credentials` (Client ID / Client Secret) ที่ตั้งค่าใน Supabase Dashboard
- `Frontend Context`:
- React Router ต้องรองรับ route `/auth/callback`
- หน้า callback หลักคือ `AuthCallbackPage.tsx`

### 1.2 P - Process (กระบวนการทำงาน)

#### Stage 1: Authentication Request

- ระบบเรียก `supabase.auth.signInWithOAuth(...)`
- ผู้ใช้ถูกส่งไปยังหน้า login ของ Identity Provider

#### Stage 2: Identity Verification

- Identity Provider ตรวจสอบตัวตนผู้ใช้
- เมื่อสำเร็จ ผู้ใช้ถูก redirect กลับ `/auth/callback` พร้อม token/code

#### Stage 3: Token Initialization

- `AuthCallbackPage.tsx` อ่าน token/code จาก callback URL
- เรียก `initialize()` ใน `auth.store.ts` เพื่อ:
- ยืนยัน session กับ Supabase Auth
- โหลดข้อมูลโปรไฟล์ผู้ใช้ (ชื่อ, ตำแหน่ง, หน่วยงาน, role) เข้าสู่ Auth Store

#### Stage 4: Data Synchronization & RBAC

- ซิงก์ข้อมูลผู้ใช้จาก SSO ลงตาราง `profiles` (upsert โดยอิง `user_id`)
- ตรวจสอบ role ตาม RBAC ของระบบ
- ตรวจสอบสถานะบัญชี (`status = active`) ก่อนอนุญาตเข้าใช้งาน
- ถ้าไม่ผ่านเงื่อนไข ให้ปฏิเสธการเข้าใช้งานและพาไปหน้าข้อความแจ้งเตือน

### 1.3 O - Output (ผลลัพธ์และการแสดงผล)

- `Session State`: ข้อมูลผู้ใช้ถูกเก็บใน `auth.store` และใช้ได้ทุกหน้า
- `Personalized UI`: หน้า Dashboard/Profile แสดงชื่อ-นามสกุล, ตำแหน่ง, กลุ่มงาน ตามข้อมูล profile
- `Access Granted`: เมนูและ route แสดงตามสิทธิ์ (เช่น HR, Executive, Admin)
- `Security Logs` (แผนถัดไป): บันทึกประวัติ login ใน `login_history` เพื่อ Audit

---

## 2. แผนดำเนินการ (Implementation Track)

1. ตั้งค่า OAuth Provider และ Redirect URL ใน Supabase Auth
2. ยืนยัน callback route `/auth/callback` ในฝั่ง React Router
3. ตรวจ flow ใน `AuthCallbackPage.tsx` ให้รับ callback และปิด loading/error states ครบ
4. ปรับ `auth.store.ts` ให้ initialize session และ sync profile อย่างเป็นระบบ
5. บังคับใช้ RBAC + account status gate ก่อนเข้า protected routes
6. ทดสอบ end-to-end SSO flow ตาม role หลัก: Super Admin, Admin, Executive, HR, Personnel
7. เพิ่ม login audit (`login_history`) ในเฟสถัดไป

---

## 3. Security และ Governance

- ห้ามเก็บ `Client Secret` ใน frontend
- ใช้เฉพาะ Supabase `anon key` ฝั่ง client และบังคับสิทธิ์ผ่าน RLS
- ตั้งค่า redirect allow-list ให้ครบทุก environment (`dev`, `staging`, `prod`)
- แยก `Authentication` ออกจาก `Authorization` ชัดเจน
- ผู้ใช้ที่ `status != active` ต้องไม่เข้าถึงข้อมูลได้ แม้ยืนยันตัวตนสำเร็จ

---

## 4. Acceptance Criteria

- ผู้ใช้ login ผ่าน SSO และกลับเข้า PTDMS ได้สำเร็จ
- ระบบโหลด profile/role ได้ถูกต้องทันทีหลัง callback
- ผู้ใช้เห็นเมนู/หน้าเฉพาะสิทธิ์ของตนเอง
- บัญชีไม่ active ถูกปฏิเสธการเข้าใช้งานถูกต้อง
- ไม่พบความลับรั่วใน source code หรือ browser
- พร้อมเชื่อมการบันทึก login audit ในตาราง `login_history`

---

## 5. ไฟล์อ้างอิงในระบบจริง

- `src/features/auth/pages/AuthCallbackPage.tsx`
- `src/features/auth/pages/LoginPage.tsx`
- `src/stores/auth.store.ts`
- `src/app/router.tsx`
- Supabase Auth Configuration (Redirect URL / OAuth Provider)
