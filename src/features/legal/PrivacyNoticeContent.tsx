import { Database, FileText, LockKeyhole, Mail, ShieldCheck, UserCheck } from 'lucide-react';

export const privacySections = [
  {
    title: '1. วัตถุประสงค์ของการเก็บ ใช้ และดูแลข้อมูล',
    icon: FileText,
    items: [
      'เพื่อยืนยันตัวตนและควบคุมสิทธิ์การเข้าใช้งานระบบ SmartDSP',
      'เพื่อบริหารจัดการข้อมูลบุคลากร ประวัติการอบรม และข้อมูลประกอบการพัฒนาศักยภาพ',
      'เพื่อสนับสนุนการรายงานผล การวิเคราะห์ภาพรวม และการให้บริการภายในกองยุทธศาสตร์และแผนงาน',
    ],
  },
  {
    title: '2. ประเภทข้อมูลที่ระบบอาจเก็บ',
    icon: Database,
    items: [
      'ข้อมูลบัญชีผู้ใช้ เช่น ชื่อ นามสกุล อีเมล บทบาทผู้ใช้งาน และสถานะบัญชี',
      'ข้อมูลโปรไฟล์บุคลากร เช่น ตำแหน่ง หน่วยงาน กลุ่มงาน ประเภทการจ้าง และข้อมูลประกอบการบริหารทรัพยากรบุคคล',
      'ข้อมูลการใช้งานระบบ เช่น ประวัติการเข้าสู่ระบบ บันทึกการทำรายการ และคำขอรับบริการที่ผู้ใช้ส่งผ่านระบบ',
    ],
  },
  {
    title: '3. การใช้และการเปิดเผยข้อมูล',
    icon: UserCheck,
    items: [
      'ข้อมูลจะถูกใช้ภายในขอบเขตงานราชการและการบริหารจัดการระบบเท่านั้น',
      'ผู้ดูแลระบบหรือเจ้าหน้าที่ที่ได้รับมอบหมายจะเข้าถึงข้อมูลตามสิทธิ์ที่จำเป็นต่อหน้าที่',
      'ระบบจะไม่เปิดเผยข้อมูลส่วนบุคคลแก่บุคคลภายนอก เว้นแต่มีเหตุจำเป็นตามกฎหมายหรือคำสั่งของหน่วยงานที่มีอำนาจ',
    ],
  },
  {
    title: '4. การรักษาความมั่นคงปลอดภัย',
    icon: LockKeyhole,
    items: [
      'ระบบใช้การยืนยันตัวตน การกำหนดสิทธิ์ตามบทบาท และการบันทึก audit log สำหรับรายการสำคัญ',
      'ผู้ใช้งานควรเก็บรักษารหัสผ่านของตนเองและออกจากระบบทุกครั้งเมื่อใช้งานบนอุปกรณ์สาธารณะ',
      'หากพบความผิดปกติในการใช้งาน ควรแจ้งผู้ดูแลระบบทันที',
    ],
  },
  {
    title: '5. ระยะเวลาการเก็บรักษาข้อมูล',
    icon: ShieldCheck,
    items: [
      'ระบบจะเก็บข้อมูลเท่าที่จำเป็นต่อการดำเนินงาน การตรวจสอบ และการรายงานตามภารกิจของหน่วยงาน',
      'ข้อมูลบางประเภท เช่น audit log หรือข้อมูลประวัติ อาจถูกเก็บตามระยะเวลาที่หน่วยงานกำหนด',
      'เมื่อหมดความจำเป็น ข้อมูลอาจถูกลบ ทำให้ไม่สามารถระบุตัวตนได้ หรือจัดเก็บในรูปแบบสรุปภาพรวม',
    ],
  },
  {
    title: '6. ช่องทางติดต่อ',
    icon: Mail,
    items: [
      'หากต้องการสอบถาม แก้ไขข้อมูล หรือแจ้งปัญหาเกี่ยวกับข้อมูลส่วนบุคคล กรุณาติดต่อผู้ดูแลระบบ SmartDSP',
      'ที่อยู่ 88/21 อาคาร 4 ชั้น 3 ถนนติวานนท์ ตำบลตลาดขวัญ จังหวัดนนทบุรี',
      'อีเมลติดต่อ: strategic.ddc2023@gmail.com',
      'โทรศัพท์ 025903898',
    ],
  },
];

export function PrivacyNoticeIntro() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white px-5 py-5 text-sm leading-7 text-slate-700 shadow-sm">
      <p>
        ด้วยพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 มีผลบังคับใช้ตั้งแต่วันที่ 1 มิถุนายน 2565 เป็นต้นไป
        เพื่อให้การคุ้มครองข้อมูลส่วนบุคคลที่อยู่ภายใต้การดำเนินงานตามภารกิจของกรมควบคุมโรคเป็นไปด้วยความถูกต้อง
        เหมาะสม และเป็นไปตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
      </p>
      <p className="mt-3">
        กลุ่มยุทธศาสตร์และพัฒนาองค์กร จึงประกาศการคุ้มครองข้อมูลส่วนบุคคล
        โดยเก็บรวบรวมข้อมูลส่วนบุคคลของบุคลากรภายใน
      </p>
      <p>กองยุทธศาสตร์และแผนงาน กรมควบคุมโรค</p>
    </section>
  );
}

export function PrivacyNoticeSummary({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid gap-4">
      {privacySections.map((section) => {
        const Icon = section.icon;
        return (
          <section key={section.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-950">{section.title}</h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  {section.items.slice(0, compact ? 2 : section.items.length).map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
