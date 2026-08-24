-- Give each system survey its own respondent-context headings and options.
-- Answered rounds remain unchanged so historical responses keep their meaning.

begin;

with system_contexts (
  survey_code,
  services_prompt,
  role_options,
  frequency_options,
  service_options
) as (
  values
    (
      'ptdms-training-development',
      'ส่วนงานหรือฟังก์ชันด้านการฝึกอบรมและบุคลากรที่เคยใช้งาน (เลือกได้มากกว่า 1 ข้อ)',
      '[{"value":"executive","label":"ผู้บริหารหรือผู้ใช้ข้อมูลเพื่อวางแผนพัฒนาบุคลากร"},{"value":"general_user","label":"ผู้ปฏิบัติงานหรือผู้ใช้งานทั่วไป"},{"value":"personnel_editor","label":"ผู้บันทึกหรือปรับปรุงข้อมูลบุคลากร"},{"value":"training_editor","label":"ผู้บันทึกหรือปรับปรุงหลักสูตรและประวัติการอบรม"},{"value":"reviewer","label":"ผู้ตรวจสอบหรือผู้อนุมัติข้อมูล"},{"value":"system_admin","label":"ผู้ดูแลระบบ"},{"value":"other","label":"อื่น ๆ"}]'::jsonb,
      '[{"value":"daily","label":"ทุกวัน"},{"value":"several_weekly","label":"สัปดาห์ละหลายครั้ง"},{"value":"weekly","label":"สัปดาห์ละ 1 ครั้ง"},{"value":"several_monthly","label":"เดือนละหลายครั้ง"},{"value":"rarely","label":"นาน ๆ ครั้ง"}]'::jsonb,
      '[{"value":"personnel_profiles","label":"ข้อมูลบุคลากรและประวัติส่วนบุคคล"},{"value":"training_courses","label":"ข้อมูลหลักสูตรฝึกอบรม"},{"value":"training_history","label":"การเพิ่มหรือแก้ไขประวัติการฝึกอบรม"},{"value":"data_review","label":"การตรวจสอบหรืออนุมัติข้อมูล"},{"value":"history_search","label":"การค้นหาและเรียกดูประวัติการอบรม"},{"value":"training_dashboard","label":"รายงาน สถิติ หรือ Dashboard การพัฒนาบุคลากร"},{"value":"system_admin","label":"งานผู้ดูแลระบบและการกำหนดสิทธิ์"},{"value":"other","label":"อื่น ๆ"}]'::jsonb
    ),
    (
      'strategy-calendar-meeting-room',
      'ส่วนงานหรือฟังก์ชันด้านกิจกรรมและห้องประชุมที่เคยใช้งาน (เลือกได้มากกว่า 1 ข้อ)',
      '[{"value":"executive","label":"ผู้บริหารหรือผู้ติดตามแผนกิจกรรม"},{"value":"activity_editor","label":"ผู้สร้างหรือปรับปรุงกิจกรรมสำคัญ"},{"value":"room_requester","label":"ผู้จองห้องประชุมหรือทรัพยากร"},{"value":"booking_reviewer","label":"ผู้ตรวจสอบหรือผู้อนุมัติรายการจอง"},{"value":"resource_manager","label":"ผู้ดูแลห้องประชุมหรือทรัพยากร"},{"value":"system_admin","label":"ผู้ดูแลระบบ"},{"value":"other","label":"อื่น ๆ"}]'::jsonb,
      '[{"value":"daily","label":"ทุกวัน"},{"value":"several_weekly","label":"สัปดาห์ละหลายครั้ง"},{"value":"weekly","label":"สัปดาห์ละ 1 ครั้ง"},{"value":"several_monthly","label":"เดือนละหลายครั้ง"},{"value":"rarely","label":"นาน ๆ ครั้ง"}]'::jsonb,
      '[{"value":"activity_calendar","label":"ปฏิทินและรายการกิจกรรมสำคัญ"},{"value":"activity_management","label":"การเพิ่มหรือแก้ไขกิจกรรม"},{"value":"activity_search","label":"การค้นหาและกรองกิจกรรม"},{"value":"room_booking","label":"การจองห้องประชุม"},{"value":"booking_approval","label":"การตรวจสอบสถานะหรืออนุมัติการจอง"},{"value":"resource_management","label":"การจัดการข้อมูลห้องประชุมและทรัพยากร"},{"value":"notifications","label":"การแจ้งเตือนหรือประสานงานกิจกรรม"},{"value":"activity_dashboard","label":"รายงาน สถิติ หรือ Dashboard"},{"value":"other","label":"อื่น ๆ"}]'::jsonb
    ),
    (
      'budget-utilization-dashboard',
      'ส่วนงานหรือฟังก์ชันด้านงบประมาณที่เคยใช้งาน (เลือกได้มากกว่า 1 ข้อ)',
      '[{"value":"executive","label":"ผู้บริหารหรือผู้ใช้ข้อมูลเพื่อการตัดสินใจ"},{"value":"budget_officer","label":"ผู้รับผิดชอบแผนงานและงบประมาณ"},{"value":"data_editor","label":"ผู้บันทึกหรือปรับปรุงข้อมูลงบประมาณ"},{"value":"reviewer","label":"ผู้ตรวจสอบหรือรับรองข้อมูล"},{"value":"excel_importer","label":"ผู้ดูแลการนำเข้าไฟล์ Excel"},{"value":"system_admin","label":"ผู้ดูแลระบบ"},{"value":"other","label":"อื่น ๆ"}]'::jsonb,
      '[{"value":"daily","label":"ทุกวัน"},{"value":"several_weekly","label":"สัปดาห์ละหลายครั้ง"},{"value":"weekly","label":"สัปดาห์ละ 1 ครั้ง"},{"value":"several_monthly","label":"เดือนละหลายครั้ง"},{"value":"quarterly","label":"เฉพาะช่วงติดตามผลหรือปิดไตรมาส"},{"value":"rarely","label":"นาน ๆ ครั้ง"}]'::jsonb,
      '[{"value":"overview_dashboard","label":"Dashboard ภาพรวมงบประมาณ"},{"value":"operational_plan_budget","label":"วงเงินตามแผนปฏิบัติราชการ"},{"value":"budget_items","label":"รายการงบประมาณและหมวดงบ"},{"value":"allocations_transfers","label":"การจัดสรรงวด รับโอน และโอนออก"},{"value":"commitments_disbursements","label":"การบันทึกผูกพันและเบิกจ่าย"},{"value":"excel_import","label":"การนำเข้าและตรวจสอบไฟล์ Excel"},{"value":"quarterly_evaluation","label":"การประเมินผลตามไตรมาส"},{"value":"decision_reports","label":"รายงาน ตาราง และกราฟเพื่อการตัดสินใจ"},{"value":"other","label":"อื่น ๆ"}]'::jsonb
    ),
    (
      'spd-service-management',
      'ส่วนงานหรือฟังก์ชันด้านบริการสารสนเทศที่เคยใช้งาน (เลือกได้มากกว่า 1 ข้อ)',
      '[{"value":"executive","label":"ผู้บริหารหรือผู้ติดตามภาพรวมงานบริการ"},{"value":"requester","label":"ผู้แจ้งขอรับบริการ"},{"value":"service_officer","label":"เจ้าหน้าที่ผู้รับผิดชอบหรือผู้ให้บริการ"},{"value":"coordinator","label":"ผู้ประสานงานหรือติดตามสถานะคำขอ"},{"value":"reviewer","label":"ผู้ตรวจสอบหรือผู้อนุมัติการดำเนินงาน"},{"value":"system_admin","label":"ผู้ดูแลระบบ"},{"value":"other","label":"อื่น ๆ"}]'::jsonb,
      '[{"value":"daily","label":"ทุกวัน"},{"value":"several_weekly","label":"สัปดาห์ละหลายครั้ง"},{"value":"weekly","label":"สัปดาห์ละ 1 ครั้ง"},{"value":"several_monthly","label":"เดือนละหลายครั้ง"},{"value":"when_needed","label":"เฉพาะเมื่อต้องแจ้งหรือติดตามคำขอ"},{"value":"rarely","label":"นาน ๆ ครั้ง"}]'::jsonb,
      '[{"value":"service_request","label":"การแจ้งขอรับบริการหรือแจ้งปัญหา"},{"value":"request_attachments","label":"การแนบข้อมูลหรือหลักฐานประกอบคำขอ"},{"value":"status_tracking","label":"การติดตามสถานะคำขอ"},{"value":"assignment","label":"การมอบหมายงานให้ผู้รับผิดชอบ"},{"value":"work_updates","label":"การอัปเดตผลดำเนินงานและปิดงาน"},{"value":"notifications","label":"การแจ้งเตือนและการสื่อสารกับผู้ขอรับบริการ"},{"value":"service_dashboard","label":"รายงาน สถิติ หรือ Dashboard งานบริการ"},{"value":"service_admin","label":"งานผู้ดูแลระบบและการจัดการประเภทบริการ"},{"value":"other","label":"อื่น ๆ"}]'::jsonb
    )
)
insert into public.smartdsp_survey_context_settings (
  survey_id,
  role_prompt,
  frequency_prompt,
  services_prompt,
  role_options,
  frequency_options,
  service_options,
  additional_fields
)
select
  survey.id,
  'บทบาทของผู้ตอบแบบสำรวจ',
  'ความถี่ในการเข้าใช้งานระบบ',
  context.services_prompt,
  context.role_options,
  context.frequency_options,
  context.service_options,
  '[]'::jsonb
from public.smartdsp_surveys survey
join system_contexts context on context.survey_code = survey.code
where not exists (
  select 1
  from public.smartdsp_survey_responses response
  where response.survey_id = survey.id
)
on conflict (survey_id) do update
set
  role_prompt = excluded.role_prompt,
  frequency_prompt = excluded.frequency_prompt,
  services_prompt = excluded.services_prompt,
  role_options = excluded.role_options,
  frequency_options = excluded.frequency_options,
  service_options = excluded.service_options;

commit;
