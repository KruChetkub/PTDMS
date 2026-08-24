-- Restore the five default survey templates without restoring respondent data.

begin;

insert into public.smartdsp_surveys (
  code,
  version,
  title,
  description,
  instructions,
  status,
  is_enabled
)
values
  (
    'smartdsp-satisfaction',
    1,
    'แบบสำรวจความพึงพอใจต่อการใช้งานระบบ SmartDSP',
    'แบบสำรวจสำหรับประเมินคุณภาพ ประสิทธิภาพ ประโยชน์ และความพึงพอใจของผู้ใช้งานระบบ SmartDSP',
    'โปรดประเมินจากประสบการณ์ใช้งานจริง โดยระดับ 1 หมายถึงควรปรับปรุงอย่างยิ่ง และระดับ 5 หมายถึงดีมาก',
    'draft',
    false
  ),
  (
    'ptdms-training-development',
    1,
    'แบบสำรวจความพึงพอใจระบบบริหารจัดการข้อมูลการฝึกอบรมและการพัฒนาบุคลากร',
    'ประเมินประสิทธิภาพการติดตามงาน ความครบถ้วนของข้อมูล การใช้ข้อมูลเพื่อการตัดสินใจ และประสิทธิภาพการบริหารจัดการด้านการฝึกอบรมและบุคลากร',
    'โปรดประเมินจากประสบการณ์ใช้งานจริง โดยระดับ 1 หมายถึงควรปรับปรุงอย่างยิ่ง และระดับ 5 หมายถึงดีมาก',
    'draft',
    false
  ),
  (
    'strategy-calendar-meeting-room',
    1,
    'แบบสำรวจความพึงพอใจระบบบันทึกกิจกรรมสำคัญและการจองห้องประชุม',
    'ประเมินประสิทธิภาพการติดตามกิจกรรม ความครบถ้วนของข้อมูล การประสานงาน และการบริหารจัดการห้องประชุม',
    'โปรดประเมินจากประสบการณ์ใช้งานจริง โดยระดับ 1 หมายถึงควรปรับปรุงอย่างยิ่ง และระดับ 5 หมายถึงดีมาก',
    'draft',
    false
  ),
  (
    'budget-utilization-dashboard',
    1,
    'แบบประเมินผลการใช้ระบบแดชบอร์ดติดตามผลการเบิกจ่ายงบประมาณ',
    'ประเมินประสิทธิภาพการติดตามงาน ความครบถ้วนของข้อมูลการดำเนินงาน การใช้ข้อมูลเพื่อการตัดสินใจของผู้บริหาร และประสิทธิภาพการบริหารจัดการของหน่วย',
    'โปรดประเมินจากประสบการณ์ใช้งานจริง โดยระดับ 1 หมายถึงควรปรับปรุงอย่างยิ่ง และระดับ 5 หมายถึงดีมาก',
    'draft',
    false
  ),
  (
    'spd-service-management',
    1,
    'แบบสำรวจความพึงพอใจระบบแจ้งขอรับบริการและงานสนับสนุนด้านสารสนเทศ',
    'ประเมินประสิทธิภาพการแจ้งคำขอ การติดตามสถานะ ความครบถ้วนของข้อมูล และการบริหารจัดการงานสนับสนุนด้านสารสนเทศ',
    'โปรดประเมินจากประสบการณ์ใช้งานจริง โดยระดับ 1 หมายถึงควรปรับปรุงอย่างยิ่ง และระดับ 5 หมายถึงดีมาก',
    'draft',
    false
  )
on conflict (code, version) do nothing;

insert into public.smartdsp_survey_rating_options (
  survey_id,
  rating_value,
  label,
  description
)
select
  survey.id,
  rating.rating_value,
  rating.label,
  rating.description
from public.smartdsp_surveys survey
cross join (
  values
    (1, 'น้อยที่สุด/ควรปรับปรุงอย่างยิ่ง', 'ระบบไม่สามารถตอบสนองความต้องการ หรือเกิดปัญหารุนแรงเป็นประจำจนไม่สามารถดำเนินงานต่อได้ และจำเป็นต้องแก้ไขโดยเร่งด่วน'),
    (2, 'น้อย/ควรปรับปรุง', 'ระบบตอบสนองได้เพียงบางส่วน มีปัญหาหรือข้อจำกัดเกิดขึ้นบ่อย ทำให้เสียเวลา เกิดความสับสน หรือต้องขอความช่วยเหลือเป็นประจำ'),
    (3, 'ปานกลาง/พอใช้', 'ระบบรองรับการทำงานพื้นฐานได้ แต่ยังมีข้อขัดข้องหรือขั้นตอนที่ไม่สะดวกเป็นบางครั้ง และยังมีประเด็นที่ควรปรับปรุงอย่างชัดเจน'),
    (4, 'มาก/ดี', 'ระบบตอบสนองความต้องการได้ดี ใช้งานสะดวกและถูกต้อง ปัญหาเกิดขึ้นน้อยและไม่กระทบสาระสำคัญของงาน'),
    (5, 'มากที่สุด/ดีมาก', 'ระบบตอบสนองความต้องการได้ครบถ้วน รวดเร็ว ถูกต้อง และต่อเนื่อง ช่วยให้การทำงานมีประสิทธิภาพอย่างชัดเจน')
) as rating(rating_value, label, description)
where survey.code in (
  'smartdsp-satisfaction',
  'ptdms-training-development',
  'strategy-calendar-meeting-room',
  'budget-utilization-dashboard',
  'spd-service-management'
)
and survey.version = 1
and not exists (
  select 1
  from public.smartdsp_survey_responses response
  where response.survey_id = survey.id
)
on conflict (survey_id, rating_value) do nothing;

insert into public.smartdsp_survey_questions (
  survey_id,
  position,
  question_type,
  prompt,
  dimension,
  help_text,
  is_required
)
select
  survey.id,
  question.position,
  question.question_type,
  question.prompt,
  question.dimension,
  question.help_text,
  question.is_required
from public.smartdsp_surveys survey
join (
  values
    ('smartdsp-satisfaction', 1, 'rating_5', 'ท่านสามารถเข้าสู่ระบบและเข้าถึงเมนูที่ได้รับสิทธิ์ได้สะดวก โดยไม่พบขั้นตอนที่ซับซ้อนหรืออุปสรรคเกินความจำเป็น', 'การเข้าถึงระบบ', null, true),
    ('smartdsp-satisfaction', 2, 'rating_5', 'เมนู ปุ่ม คำอธิบาย และลำดับขั้นตอนของระบบมีความชัดเจน ทำให้เรียนรู้และใช้งานได้ง่าย', 'ความง่ายในการใช้งาน', null, true),
    ('smartdsp-satisfaction', 3, 'rating_5', 'การจัดวางหน้าจอ ขนาดข้อความ สี และรูปแบบการแสดงผลมีความเหมาะสม สามารถอ่านและใช้งานได้อย่างสะดวก', 'การออกแบบส่วนติดต่อผู้ใช้', null, true),
    ('smartdsp-satisfaction', 4, 'rating_5', 'ระบบตอบสนองได้รวดเร็ว มีความเสถียร และไม่เกิดข้อผิดพลาดหรือหยุดทำงานระหว่างการใช้งานบ่อยครั้ง', 'ประสิทธิภาพและเสถียรภาพ', null, true),
    ('smartdsp-satisfaction', 5, 'rating_5', 'ข้อมูลและเอกสารที่แสดงในระบบมีความถูกต้อง ครบถ้วน เป็นปัจจุบัน และน่าเชื่อถือสำหรับนำไปใช้งาน', 'คุณภาพข้อมูล', null, true),
    ('smartdsp-satisfaction', 6, 'rating_5', 'ระบบช่วยให้ค้นหา เข้าถึง ดาวน์โหลด หรือเรียกใช้ข้อมูลและเอกสารที่ต้องการได้สะดวกและรวดเร็ว', 'การสืบค้นและเข้าถึงข้อมูล', null, true),
    ('smartdsp-satisfaction', 7, 'rating_5', 'ฟังก์ชันของระบบสอดคล้องกับบทบาท ภารกิจ และขั้นตอนการปฏิบัติงานของท่าน', 'ความเหมาะสมกับภารกิจ', null, true),
    ('smartdsp-satisfaction', 8, 'rating_5', 'ท่านมีความเชื่อมั่นว่าระบบกำหนดสิทธิ์การเข้าถึงอย่างเหมาะสม และช่วยป้องกันผู้ที่ไม่มีสิทธิ์เข้าถึงหรือแก้ไขข้อมูล', 'ความมั่นคงปลอดภัยและสิทธิ์', null, true),
    ('smartdsp-satisfaction', 9, 'rating_5', 'ระบบช่วยลดเวลา ลดขั้นตอน ลดความซ้ำซ้อน หรือเพิ่มความสะดวกในการปฏิบัติงานของท่านได้อย่างชัดเจน', 'ประสิทธิผลต่อการปฏิบัติงาน', null, true),
    ('smartdsp-satisfaction', 10, 'rating_5', 'โดยภาพรวม ท่านมีความพึงพอใจต่อระบบ SmartDSP และมีความประสงค์จะใช้งานระบบอย่างต่อเนื่อง', 'ความพึงพอใจโดยรวม', null, true),
    ('smartdsp-satisfaction', 11, 'open_text', 'โปรดระบุปัญหา อุปสรรค ขั้นตอน หรือส่วนของระบบ SmartDSP ที่ควรได้รับการปรับปรุง', 'ปัญหาและสิ่งที่ควรปรับปรุง', 'โปรดยกตัวอย่างเหตุการณ์หรือผลกระทบต่อการปฏิบัติงาน หากมี', false),
    ('smartdsp-satisfaction', 12, 'open_text', 'โปรดเสนอฟังก์ชัน บริการ ข้อมูล หรือแนวทางพัฒนาระบบ SmartDSP เพิ่มเติม', 'ข้อเสนอแนะเพิ่มเติม', null, false),

    ('ptdms-training-development', 1, 'rating_5', 'ระบบช่วยให้ค้นหาและติดตามข้อมูลหลักสูตรหรือประวัติการอบรมได้สะดวก', 'ประสิทธิภาพการติดตามงาน', null, true),
    ('ptdms-training-development', 2, 'rating_5', 'ระบบช่วยลดเวลาในการรวบรวมข้อมูลการฝึกอบรมของบุคลากร', 'ประสิทธิภาพการติดตามงาน', null, true),
    ('ptdms-training-development', 3, 'rating_5', 'ข้อมูลหลักสูตร ประวัติการอบรม และข้อมูลที่เกี่ยวข้องมีความครบถ้วนเพียงพอต่อการใช้งาน', 'ความครบถ้วนของข้อมูล', null, true),
    ('ptdms-training-development', 4, 'rating_5', 'ข้อมูลในระบบมีความถูกต้อง เป็นปัจจุบัน และน่าเชื่อถือ', 'ความครบถ้วนของข้อมูล', null, true),
    ('ptdms-training-development', 5, 'rating_5', 'รายงานหรือ Dashboard ช่วยให้เห็นภาพรวมการพัฒนาบุคลากรได้ชัดเจน', 'การใช้ข้อมูลเพื่อการตัดสินใจ', null, true),
    ('ptdms-training-development', 6, 'rating_5', 'ข้อมูลจากระบบช่วยสนับสนุนการวางแผนพัฒนาบุคลากรของหน่วยงาน', 'การใช้ข้อมูลเพื่อการตัดสินใจ', null, true),
    ('ptdms-training-development', 7, 'rating_5', 'ขั้นตอนการบันทึก แก้ไข ตรวจสอบ และเรียกใช้ข้อมูลมีความเหมาะสม', 'ประสิทธิภาพการบริหารจัดการ', null, true),
    ('ptdms-training-development', 8, 'rating_5', 'ระบบช่วยลดความซ้ำซ้อนของการจัดเก็บข้อมูลฝึกอบรม', 'ประสิทธิภาพการบริหารจัดการ', null, true),
    ('ptdms-training-development', 9, 'rating_5', 'ระบบมีความเสถียร ใช้งานต่อเนื่อง และตอบสนองได้รวดเร็ว', 'คุณภาพการใช้งานระบบ', null, true),
    ('ptdms-training-development', 10, 'rating_5', 'โดยภาพรวม ท่านพึงพอใจต่อระบบบริหารจัดการข้อมูลการฝึกอบรมและการพัฒนาบุคลากร', 'ความพึงพอใจโดยรวม', null, true),
    ('ptdms-training-development', 11, 'open_text', 'ปัญหา อุปสรรค หรือข้อมูลที่ยังไม่ครบถ้วนในระบบนี้คืออะไร', 'ปัญหาและสิ่งที่ควรปรับปรุง', null, false),
    ('ptdms-training-development', 12, 'open_text', 'ท่านต้องการให้เพิ่มฟังก์ชันหรือรายงานใดเพื่อสนับสนุนงานฝึกอบรมและพัฒนาบุคลากร', 'ข้อเสนอแนะเพิ่มเติม', null, false),

    ('strategy-calendar-meeting-room', 1, 'rating_5', 'ระบบช่วยให้ติดตามกิจกรรมสำคัญของหน่วยงานได้ชัดเจนและทันเวลา', 'ประสิทธิภาพการติดตามงาน', null, true),
    ('strategy-calendar-meeting-room', 2, 'rating_5', 'ระบบช่วยให้ตรวจสอบสถานะการจองห้องประชุมได้สะดวก', 'ประสิทธิภาพการติดตามงาน', null, true),
    ('strategy-calendar-meeting-room', 3, 'rating_5', 'ข้อมูลกิจกรรม วันเวลา สถานที่ และผู้รับผิดชอบมีความครบถ้วน', 'ความครบถ้วนของข้อมูล', null, true),
    ('strategy-calendar-meeting-room', 4, 'rating_5', 'ข้อมูลห้องประชุมและสถานะการจองมีความถูกต้องและเป็นปัจจุบัน', 'ความครบถ้วนของข้อมูล', null, true),
    ('strategy-calendar-meeting-room', 5, 'rating_5', 'ระบบช่วยให้ผู้บริหารหรือผู้เกี่ยวข้องเห็นภาพรวมกิจกรรมและการใช้ห้องประชุมได้ดีขึ้น', 'การใช้ข้อมูลเพื่อการตัดสินใจ', null, true),
    ('strategy-calendar-meeting-room', 6, 'rating_5', 'ข้อมูลจากระบบช่วยลดปัญหาการจองซ้ำหรือการประสานงานคลาดเคลื่อน', 'การใช้ข้อมูลเพื่อการตัดสินใจ', null, true),
    ('strategy-calendar-meeting-room', 7, 'rating_5', 'ขั้นตอนการเพิ่มกิจกรรมหรือจองห้องประชุมมีความชัดเจนและใช้งานง่าย', 'ประสิทธิภาพการบริหารจัดการ', null, true),
    ('strategy-calendar-meeting-room', 8, 'rating_5', 'ระบบช่วยลดขั้นตอนการแจ้ง ประสาน และติดตามกิจกรรมหรือห้องประชุม', 'ประสิทธิภาพการบริหารจัดการ', null, true),
    ('strategy-calendar-meeting-room', 9, 'rating_5', 'ระบบมีความเสถียรและแสดงผลปฏิทินหรือรายการจองได้รวดเร็ว', 'คุณภาพการใช้งานระบบ', null, true),
    ('strategy-calendar-meeting-room', 10, 'rating_5', 'โดยภาพรวม ท่านพึงพอใจต่อระบบบันทึกกิจกรรมสำคัญและการจองห้องประชุม', 'ความพึงพอใจโดยรวม', null, true),
    ('strategy-calendar-meeting-room', 11, 'open_text', 'ปัญหาที่พบในการบันทึกกิจกรรมหรือจองห้องประชุมคืออะไร', 'ปัญหาและสิ่งที่ควรปรับปรุง', null, false),
    ('strategy-calendar-meeting-room', 12, 'open_text', 'ท่านต้องการให้เพิ่มข้อมูล มุมมองปฏิทิน หรือขั้นตอนการแจ้งเตือนใด', 'ข้อเสนอแนะเพิ่มเติม', null, false),

    ('budget-utilization-dashboard', 1, 'rating_5', 'Dashboard ช่วยให้ติดตามภาพรวมงบประมาณ วงเงินตามแผน ยอดสุทธิ ผลเบิกจ่าย และคงเหลือได้รวดเร็ว', 'ประสิทธิภาพการติดตามงาน', null, true),
    ('budget-utilization-dashboard', 2, 'rating_5', 'ระบบช่วยให้เห็นสถานะการใช้จ่ายงบประมาณตามหมวดงบหรือรายการงบประมาณได้ชัดเจน', 'ประสิทธิภาพการติดตามงาน', null, true),
    ('budget-utilization-dashboard', 3, 'rating_5', 'ข้อมูลจัดสรรงวด รับโอน โอนออก ผูกพัน เบิกจ่าย และคงเหลือมีความครบถ้วนเพียงพอต่อการติดตามงาน', 'ความครบถ้วนของข้อมูลการดำเนินงาน', null, true),
    ('budget-utilization-dashboard', 4, 'rating_5', 'ข้อมูลที่แสดงใน Dashboard มีความถูกต้อง ตรงกับไฟล์นำเข้า และเป็นปัจจุบัน', 'ความครบถ้วนของข้อมูลการดำเนินงาน', null, true),
    ('budget-utilization-dashboard', 5, 'rating_5', 'Dashboard ช่วยให้ผู้บริหารเห็นประเด็นสำคัญและตัดสินใจด้านงบประมาณได้ดีขึ้น', 'การใช้ข้อมูลเพื่อการตัดสินใจของผู้บริหาร', null, true),
    ('budget-utilization-dashboard', 6, 'rating_5', 'การแสดงผลเป็นกราฟ ตาราง และตัวชี้วัดช่วยให้เปรียบเทียบงบประมาณแต่ละหมวดได้ชัดเจน', 'การใช้ข้อมูลเพื่อการตัดสินใจของผู้บริหาร', null, true),
    ('budget-utilization-dashboard', 7, 'rating_5', 'ระบบช่วยลดเวลาในการรวบรวม วิเคราะห์ และจัดทำรายงานงบประมาณ', 'ประสิทธิภาพการบริหารจัดการของหน่วย', null, true),
    ('budget-utilization-dashboard', 8, 'rating_5', 'ขั้นตอนการนำเข้าข้อมูลและตรวจสอบรายการงบประมาณมีความเหมาะสมและลดความผิดพลาด', 'ประสิทธิภาพการบริหารจัดการของหน่วย', null, true),
    ('budget-utilization-dashboard', 9, 'rating_5', 'ระบบมีความเสถียรและแสดงผลข้อมูลการเงินได้ถูกต้องโดยไม่ปัดเศษผิดพลาด', 'คุณภาพการใช้งานระบบ', null, true),
    ('budget-utilization-dashboard', 10, 'rating_5', 'โดยภาพรวม ท่านพึงพอใจต่อแดชบอร์ดติดตามการใช้จ่ายงบประมาณ', 'ความพึงพอใจโดยรวม', null, true),
    ('budget-utilization-dashboard', 11, 'open_text', 'ข้อมูลใดใน Dashboard งบประมาณที่ยังไม่ครบถ้วนหรือควรปรับรูปแบบการแสดงผล', 'ปัญหาและสิ่งที่ควรปรับปรุง', null, false),
    ('budget-utilization-dashboard', 12, 'open_text', 'ท่านต้องการรายงาน กราฟ หรือตัวชี้วัดใดเพิ่มเติมเพื่อใช้ติดตามและตัดสินใจด้านงบประมาณ', 'ข้อเสนอแนะเพิ่มเติม', null, false),

    ('spd-service-management', 1, 'rating_5', 'ระบบช่วยให้แจ้งขอรับบริการได้สะดวกและลดขั้นตอนการประสานงาน', 'ประสิทธิภาพการติดตามงาน', null, true),
    ('spd-service-management', 2, 'rating_5', 'ระบบช่วยให้ติดตามสถานะคำขอรับบริการได้ชัดเจนและทันเวลา', 'ประสิทธิภาพการติดตามงาน', null, true),
    ('spd-service-management', 3, 'rating_5', 'ข้อมูลคำขอ รายละเอียดปัญหา ผู้รับผิดชอบ และสถานะมีความครบถ้วน', 'ความครบถ้วนของข้อมูล', null, true),
    ('spd-service-management', 4, 'rating_5', 'ข้อมูลการดำเนินงานและผลการให้บริการมีความถูกต้องและเป็นปัจจุบัน', 'ความครบถ้วนของข้อมูล', null, true),
    ('spd-service-management', 5, 'rating_5', 'รายงานหรือ Dashboard ช่วยให้เห็นภาพรวมปริมาณงาน ประเภทคำขอ และสถานะบริการได้ดีขึ้น', 'การใช้ข้อมูลเพื่อการตัดสินใจ', null, true),
    ('spd-service-management', 6, 'rating_5', 'ข้อมูลจากระบบช่วยสนับสนุนการจัดลำดับความสำคัญและวางแผนทรัพยากรงานบริการ', 'การใช้ข้อมูลเพื่อการตัดสินใจ', null, true),
    ('spd-service-management', 7, 'rating_5', 'ระบบช่วยลดความซ้ำซ้อนในการรับเรื่อง ติดตาม และสรุปผลคำขอรับบริการ', 'ประสิทธิภาพการบริหารจัดการ', null, true),
    ('spd-service-management', 8, 'rating_5', 'ขั้นตอนการมอบหมายงาน อัปเดตสถานะ และปิดงานมีความเหมาะสม', 'ประสิทธิภาพการบริหารจัดการ', null, true),
    ('spd-service-management', 9, 'rating_5', 'ระบบมีความเสถียร ใช้งานง่าย และรองรับการแจ้งคำขอได้ต่อเนื่อง', 'คุณภาพการใช้งานระบบ', null, true),
    ('spd-service-management', 10, 'rating_5', 'โดยภาพรวม ท่านพึงพอใจต่อระบบแจ้งขอรับบริการและงานสนับสนุนด้านสารสนเทศ', 'ความพึงพอใจโดยรวม', null, true),
    ('spd-service-management', 11, 'open_text', 'ปัญหาหรือข้อจำกัดที่พบในการแจ้งขอรับบริการหรือติดตามสถานะคืออะไร', 'ปัญหาและสิ่งที่ควรปรับปรุง', null, false),
    ('spd-service-management', 12, 'open_text', 'ท่านต้องการให้เพิ่มฟังก์ชัน แจ้งเตือน หรือรายงานใดเพื่อสนับสนุนงานบริการ', 'ข้อเสนอแนะเพิ่มเติม', null, false)
) as question(survey_code, position, question_type, prompt, dimension, help_text, is_required)
  on question.survey_code = survey.code
where survey.version = 1
and not exists (
  select 1
  from public.smartdsp_survey_responses response
  where response.survey_id = survey.id
)
on conflict (survey_id, position) do nothing;

insert into public.smartdsp_survey_context_settings (
  survey_id,
  role_prompt,
  frequency_prompt,
  services_prompt,
  role_options,
  frequency_options,
  service_options
)
select
  survey.id,
  'บทบาทของผู้ตอบแบบสำรวจ',
  'ความถี่ในการเข้าใช้งานระบบ',
  'ส่วนงานหรือบริการของ SmartDSP ที่เคยใช้งาน (เลือกได้มากกว่า 1 ข้อ)',
  '[{"value":"executive","label":"ผู้บริหาร"},{"value":"general_user","label":"ผู้ปฏิบัติงาน/ผู้ใช้งานทั่วไป"},{"value":"data_editor","label":"ผู้บันทึกหรือปรับปรุงข้อมูล"},{"value":"reviewer","label":"ผู้ตรวจสอบหรือผู้อนุมัติ"},{"value":"system_admin","label":"ผู้ดูแลระบบ"},{"value":"other","label":"อื่น ๆ"}]'::jsonb,
  '[{"value":"daily","label":"ทุกวัน"},{"value":"several_weekly","label":"สัปดาห์ละหลายครั้ง"},{"value":"weekly","label":"สัปดาห์ละ 1 ครั้ง"},{"value":"several_monthly","label":"เดือนละหลายครั้ง"},{"value":"rarely","label":"นาน ๆ ครั้ง"}]'::jsonb,
  '[{"value":"public_home_search","label":"หน้าหลักและการสืบค้นข้อมูลสาธารณะ"},{"value":"strategy_plans","label":"ยุทธศาสตร์และแผนปฏิบัติราชการ"},{"value":"performance_results","label":"ผลการดำเนินงานสำคัญของกรมควบคุมโรค"},{"value":"r2r_research","label":"งานวิจัยจากงานประจำ"},{"value":"personnel_profile","label":"ข้อมูลบุคลากรและข้อมูลส่วนบุคคลของผู้ใช้งาน"},{"value":"training_records","label":"ข้อมูลหลักสูตรและประวัติการฝึกอบรม"},{"value":"service_requests","label":"ระบบงานบริการหรือการติดตามคำขอ"},{"value":"meeting_resources","label":"ระบบจองห้องประชุมหรือทรัพยากร"},{"value":"reports_dashboard","label":"รายงาน สถิติ หรือ Dashboard"},{"value":"site_admin","label":"งานผู้ดูแลระบบและการจัดการเนื้อหา"},{"value":"other","label":"อื่น ๆ"}]'::jsonb
from public.smartdsp_surveys survey
where survey.code in (
  'smartdsp-satisfaction',
  'ptdms-training-development',
  'strategy-calendar-meeting-room',
  'budget-utilization-dashboard',
  'spd-service-management'
)
and survey.version = 1
and not exists (
  select 1
  from public.smartdsp_survey_responses response
  where response.survey_id = survey.id
)
on conflict (survey_id) do nothing;

commit;
