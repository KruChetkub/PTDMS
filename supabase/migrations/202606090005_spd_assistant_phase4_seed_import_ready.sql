-- SPD Assistant Phase 4: production-safe starter knowledge and import readiness.

insert into public.spd_assistant_sources (source_key, title, source_type, file_path, version, active)
values
  ('phase4-starter-knowledge', 'SPD Assistant Phase 4 Starter Knowledge', 'knowledge_base', '/docs/SPD_ASSISTANT_IMPORT_RUNBOOK.md', '1.0.0', true),
  ('phase4-page-contexts', 'SPD Assistant Phase 4 Starter Page Contexts', 'page_contexts', '/docs/PAGE_CONTEXTS_TH.json', '1.0.0', true)
on conflict (source_key) do update
set title = excluded.title,
    source_type = excluded.source_type,
    file_path = excluded.file_path,
    version = excluded.version,
    active = excluded.active,
    updated_at = now();

insert into public.spd_assistant_page_contexts (
  route,
  page_name_th,
  module_name_th,
  description_th,
  help_text_th,
  available_actions_th,
  common_questions_th,
  related_roles,
  active
)
values
  ('/', 'หน้าเปลี่ยนเส้นทางหลัก', 'การนำทาง', 'เส้นทางรากของระบบ ใช้เปลี่ยนผู้ใช้ไปยังหน้า Portal หรือหน้าเข้าสู่ระบบตามสถานะการล็อกอิน', 'ผู้ใช้ไม่ต้องใช้งานหน้านี้โดยตรง ระบบจะเปลี่ยนเส้นทางให้อัตโนมัติ', array['เปิดระบบจาก URL หลัก', 'เข้าสู่ Portal หลังล็อกอิน', 'ไปหน้า Login หากยังไม่ได้ล็อกอิน'], array['ทำไมเปิดหน้าแรกแล้วถูกพาไป Portal', 'หน้า / ใช้ทำอะไร'], array['super_admin','admin','executive','hr','personnel']::public.user_role[], true),
  ('/profile', 'โปรไฟล์ของฉัน', 'Personnel', 'หน้าดูข้อมูลโปรไฟล์และประวัติที่เกี่ยวข้องกับผู้ใช้ปัจจุบัน', 'ใช้ตรวจสอบข้อมูลส่วนตัวและข้อมูลการอบรมของตนเอง หากต้องการแก้ไขให้ไปหน้า Settings หรือ Self-Service ตามประเภทข้อมูล', array['ดูข้อมูลโปรไฟล์', 'ดูประวัติการอบรม', 'ไปเพิ่มข้อมูลอบรม'], array['ดูโปรไฟล์ตัวเองได้ที่ไหน', 'แก้ข้อมูลส่วนตัวอย่างไร'], array['super_admin','admin','executive','hr','personnel']::public.user_role[], true),
  ('/self-service', 'Self-Service Training', 'Training', 'หน้าสำหรับเพิ่มประวัติการอบรมของตนเองหรือบุคลากรตามสิทธิ์', 'กรอกข้อมูลหลักสูตร ผู้จัด วันที่ ปีงบประมาณ และรายละเอียด development แล้วบันทึก', array['เพิ่มประวัติอบรม', 'กรอกข้อมูลหลักสูตร', 'บันทึกข้อมูล'], array['เพิ่มประวัติอบรมของตัวเองอย่างไร', 'ทำไมบันทึกไม่ได้'], array['super_admin','admin','hr','personnel']::public.user_role[], true),
  ('/dashboard', 'แดชบอร์ดภาพรวม', 'Analytics', 'หน้าแสดงภาพรวมข้อมูลการอบรมและสถิติตามสิทธิ์', 'ใช้ดูตัวเลขสรุป กราฟ และข้อมูลเปรียบเทียบเพื่อประกอบการตัดสินใจ', array['ดูสรุปข้อมูล', 'กรองข้อมูล', 'ดูกราฟ'], array['Dashboard แสดงอะไร', 'ทำไมเห็นข้อมูลไม่ครบ'], array['super_admin','admin','executive','hr']::public.user_role[], true),
  ('/courses', 'รายการหลักสูตร', 'Training', 'หน้าดูและวิเคราะห์รายการหลักสูตรจากประวัติการอบรม', 'ใช้ค้นหาหลักสูตร ดูผู้เข้าอบรม และดูรายละเอียดตามข้อมูลที่มีในระบบ', array['ค้นหาหลักสูตร', 'ดูรายละเอียดหลักสูตร', 'ดูผู้เข้าอบรม'], array['ค้นหาหลักสูตรอย่างไร', 'ข้อมูลหลักสูตรมาจากไหน'], array['super_admin','admin','executive','hr']::public.user_role[], true),
  ('/analytics', 'วิเคราะห์ข้อมูล', 'Analytics', 'หน้าวิเคราะห์ข้อมูลบุคลากรและการอบรมเชิงลึก', 'ใช้ดูแนวโน้ม กลุ่มทักษะ และข้อมูลแยกตามมิติที่ระบบรองรับ', array['ดูกราฟวิเคราะห์', 'กรองข้อมูล', 'เปรียบเทียบข้อมูล'], array['วิเคราะห์ข้อมูลอะไรได้บ้าง', 'ใครเข้าหน้านี้ได้'], array['super_admin','admin','executive','hr']::public.user_role[], true),
  ('/it-assets', 'Dashboard ทรัพย์สิน IT', 'IT Assets', 'หน้าแสดงภาพรวมและรายการทรัพย์สิน IT', 'ใช้ดู ค้นหา กรอง และเปิดรายละเอียดทรัพย์สิน IT การแก้ไขต้องใช้หน้า Manage IT Assets', array['ดูภาพรวมทรัพย์สิน', 'ค้นหา', 'กรอง', 'เปิดรายละเอียด'], array['ดู asset ได้ที่ไหน', 'ทำไมแก้ asset ไม่ได้'], array['super_admin','admin','executive','hr','personnel']::public.user_role[], true),
  ('/it-assets/manage', 'จัดการทรัพย์สิน IT', 'IT Assets', 'หน้าสำหรับเพิ่ม แก้ไข และจัดการรายการทรัพย์สิน IT', 'ใช้สำหรับผู้ดูแลที่มีสิทธิ์ admin ขึ้นไปในการบันทึกข้อมูล asset', array['เพิ่ม asset', 'แก้ไข asset', 'บันทึกข้อมูล', 'ค้นหา asset'], array['เพิ่ม asset อย่างไร', 'ใครจัดการทรัพย์สินได้'], array['super_admin','admin']::public.user_role[], true),
  ('/strategy-calendar', 'Strategy Calendar', 'Strategy', 'หน้าปฏิทินกิจกรรมและแผนงานเชิงกลยุทธ์', 'ใช้ดู สร้าง หรือจัดการ event ตามสิทธิ์ของผู้ใช้', array['ดูปฏิทิน', 'สร้าง event', 'แก้ไข event ตามสิทธิ์'], array['สร้าง event อย่างไร', 'ใครแก้ไข event ได้'], array['super_admin','admin','executive','hr','personnel']::public.user_role[], true),
  ('/admin/security', 'Security', 'Administration', 'หน้าตรวจสอบข้อมูลด้านความปลอดภัย เช่น login history', 'ใช้โดย super_admin เพื่อตรวจสอบเหตุการณ์ด้านความปลอดภัยและประวัติการเข้าสู่ระบบ', array['ดู login history', 'ตรวจสอบเหตุการณ์ความปลอดภัย'], array['ใครดูหน้า Security ได้', 'ดูประวัติ login ที่ไหน'], array['super_admin']::public.user_role[], true),
  ('*', 'บริบททั่วไปของระบบ', 'SPD Assistant', 'บริบทสำรองเมื่อไม่พบข้อมูลเฉพาะ route', 'ถามคำถามเกี่ยวกับการใช้งานระบบ หากไม่มีข้อมูลในฐานความรู้ Assistant จะตอบข้อความไม่พบข้อมูล', array['ถามคำถาม', 'ดูคำตอบจากฐานความรู้'], array['ทำไม Assistant ไม่พบข้อมูล', 'Assistant ตอบจากที่ไหน'], array['super_admin','admin','executive','hr','personnel']::public.user_role[], true)
on conflict (route) do update
set page_name_th = excluded.page_name_th,
    module_name_th = excluded.module_name_th,
    description_th = excluded.description_th,
    help_text_th = excluded.help_text_th,
    available_actions_th = excluded.available_actions_th,
    common_questions_th = excluded.common_questions_th,
    related_roles = excluded.related_roles,
    active = excluded.active,
    updated_at = now();

with source as (
  select id from public.spd_assistant_sources where source_key = 'phase4-starter-knowledge' limit 1
),
starter_records as (
  select *
  from (
    values
      ('โปรไฟล์ของฉัน', 'Personnel', '/profile', array['โปรไฟล์','profile','ข้อมูลส่วนตัว']::text[], 'ดูโปรไฟล์ของตัวเองได้ที่ไหน', 'เปิดหน้าโปรไฟล์ของฉันเพื่อดูข้อมูลส่วนตัวและข้อมูลการอบรมของตนเอง หากต้องการแก้ไขข้อมูลบัญชีให้ไปที่ Settings หรือแจ้งผู้ดูแลตามสิทธิ์', array['super_admin','admin','executive','hr','personnel']::public.user_role[], 'faq', 35),
      ('Self-Service Training', 'Training', '/self-service', array['self-service','เพิ่มอบรม','training record']::text[], 'เพิ่มประวัติอบรมอย่างไร', 'เปิดหน้า Self-Service กรอกข้อมูลหลักสูตร ผู้จัด วันที่ ปีงบประมาณ และรายละเอียด development ให้ครบ จากนั้นกดบันทึก หากบันทึกไม่ได้ให้ตรวจสอบสิทธิ์และข้อมูลที่จำเป็น', array['super_admin','admin','hr','personnel']::public.user_role[], 'workflow', 40),
      ('Dashboard', 'Analytics', '/dashboard', array['dashboard','สรุป','กราฟ','รายงาน']::text[], 'Dashboard ใช้ทำอะไร', 'Dashboard ใช้ดูภาพรวมและสถิติการอบรมตามสิทธิ์ของผู้ใช้ เช่น จำนวนรายการ กราฟสรุป และข้อมูลเปรียบเทียบเพื่อประกอบการติดตามผล', array['super_admin','admin','executive','hr']::public.user_role[], 'page', 45),
      ('Courses', 'Training', '/courses', array['courses','หลักสูตร','รายการหลักสูตร']::text[], 'ค้นหาหลักสูตรได้ที่ไหน', 'เปิดหน้ารายการหลักสูตรเพื่อค้นหาและดูรายละเอียดหลักสูตรจากข้อมูลประวัติการอบรมที่บันทึกไว้ในระบบ', array['super_admin','admin','executive','hr']::public.user_role[], 'faq', 55),
      ('Analytics', 'Analytics', '/analytics', array['analytics','วิเคราะห์','สถิติ']::text[], 'ใครดูหน้าวิเคราะห์ข้อมูลได้', 'หน้าวิเคราะห์ข้อมูลเปิดให้บทบาท super_admin, admin, executive และ hr เพื่อดูข้อมูลเชิงลึกตามสิทธิ์ที่ระบบกำหนด', array['super_admin','admin','executive','hr']::public.user_role[], 'permission', 65),
      ('IT Assets Dashboard', 'IT Assets', '/it-assets', array['it assets','asset','ทรัพย์สิน','dashboard']::text[], 'ดูทรัพย์สิน IT ได้ที่ไหน', 'เปิดหน้า IT Assets เพื่อดูภาพรวม ค้นหา กรอง และเปิดรายละเอียดทรัพย์สิน IT ผู้ใช้ active ทุกบทบาทสามารถดูได้ตามสิทธิ์', array['super_admin','admin','executive','hr','personnel']::public.user_role[], 'faq', 75),
      ('Manage IT Assets', 'IT Assets', '/it-assets/manage', array['manage asset','เพิ่ม asset','แก้ไข asset']::text[], 'ใครเพิ่มหรือแก้ไข IT Asset ได้', 'การเพิ่มหรือแก้ไข IT Asset ทำได้จากหน้า Manage IT Assets และจำกัดสำหรับบทบาท super_admin หรือ admin เท่านั้น', array['super_admin','admin']::public.user_role[], 'permission', 80),
      ('Strategy Calendar', 'Strategy', '/strategy-calendar', array['calendar','strategy','event','ปฏิทิน']::text[], 'Strategy Calendar ใช้ทำอะไร', 'Strategy Calendar ใช้ดูและจัดการกิจกรรมหรือแผนงานเชิงกลยุทธ์ในรูปแบบปฏิทิน การสร้างและแก้ไขขึ้นอยู่กับสิทธิ์ของผู้ใช้', array['super_admin','admin','executive','hr','personnel']::public.user_role[], 'page', 85),
      ('Security Audit', 'Administration', '/admin/security', array['security','login history','audit']::text[], 'ใครดูหน้า Security ได้', 'หน้า Security เปิดให้เฉพาะ super_admin ใช้ตรวจสอบข้อมูลด้านความปลอดภัย เช่น ประวัติการเข้าสู่ระบบ', array['super_admin']::public.user_role[], 'permission', 95),
      ('SPD Assistant Source Policy', 'SPD Assistant', null, array['assistant','ฐานความรู้','ไม่พบข้อมูล']::text[], 'SPD Assistant ตอบจากที่ไหน', 'SPD Assistant ตอบจากฐานความรู้ภายในที่บันทึกไว้ในระบบเท่านั้น หากไม่พบข้อมูลที่ตรงและได้รับอนุญาตตามบทบาท ระบบจะตอบว่า ขออภัย ไม่พบข้อมูลในฐานความรู้ของระบบ', array['super_admin','admin','executive','hr','personnel']::public.user_role[], 'policy', 5)
  ) as record(title, module, route, keywords, question, answer, related_roles, content_type, priority)
)
insert into public.spd_assistant_knowledge (
  source_id,
  title,
  module,
  route,
  keywords,
  question,
  answer,
  related_roles,
  content_type,
  priority,
  active
)
select
  source.id,
  starter_records.title,
  starter_records.module,
  starter_records.route,
  starter_records.keywords,
  starter_records.question,
  starter_records.answer,
  starter_records.related_roles,
  starter_records.content_type,
  starter_records.priority,
  true
from source
cross join starter_records
where not exists (
  select 1
  from public.spd_assistant_knowledge existing
  where existing.question = starter_records.question
    and coalesce(existing.route, '') = coalesce(starter_records.route, '')
);

update public.spd_assistant_knowledge
set source_id = (select id from public.spd_assistant_sources where source_key = 'phase4-starter-knowledge' limit 1)
where source_id is null
  and question in (
    'เข้าสู่ระบบอย่างไร',
    'ลืมรหัสผ่านต้องทำอย่างไร',
    'Portal ใช้ทำอะไร',
    'แก้ไขประวัติการอบรมอย่างไร',
    'เพิ่มประวัติอบรมของตัวเองอย่างไร',
    'ใครจัดการผู้ใช้ได้',
    'super_admin ทำอะไรได้บ้าง',
    'ทำไมเปิดหน้าได้แต่บันทึกไม่ได้',
    'เพิ่มหรือแก้ไข IT Asset อย่างไร',
    'ใครดูประวัติการเข้าสู่ระบบได้',
    'ถ้า Assistant ไม่พบข้อมูลต้องตอบอย่างไร'
  );
