import { ArrowLeft, Database, FileText, LockKeyhole, Mail, ShieldCheck, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LegalFooter } from './LegalFooter';

const privacySections = [
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
      'ตัวอย่างอีเมลติดต่อ: smartdsp@example.go.th',
      'ข้อความในหน้านี้เป็นตัวอย่างสำหรับตรวจรูปแบบก่อนใช้งานจริง และควรตรวจทานโดยผู้รับผิดชอบด้านกฎหมาย/คุ้มครองข้อมูลก่อนประกาศใช้',
    ],
  },
];

export function PrivacyNoticePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <Link to="/login" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-pink-700 transition hover:text-pink-600">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            กลับหน้าเข้าสู่ระบบ
          </Link>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-pink-700">Privacy Notice</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">ประกาศความเป็นส่วนตัวสำหรับผู้ใช้งาน SmartDSP</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-slate-200 bg-white px-5 py-5 text-sm leading-7 text-slate-700 shadow-sm">
          <p>
            ด้วยพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 มีผลบังคับใช้ตั้งแต่วันที่ 1 มิถุนายน 2565 เป็นต้นไป
            เพื่อให้การคุ้มครองข้อมูลส่วนบุคคลที่อยู่ภายใต้การดำเนินงานตามภารกิจของกรมควบคุมโรคเป็นไปด้วยความถูกต้อง
            เหมาะสม และเป็นไปตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
          </p>
          <p className="mt-3">
            กลุ่มยุทธศาสตร์และพัฒนาองค์กร จึงประกาศการคุ้มครองข้อมูลส่วนบุคคล
            โดยเก็บรวบรวมข้อมูลส่วนบุคคลของบุคลากรภายในกองยุทธศาสตร์และแผนงาน 
          </p>
          <p>กรมควบคุมโรค</p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-pink-50 text-pink-700">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-slate-950">เอกสารประกาศจากกรมควบคุมโรค</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">เปิดอ่านเอกสารอ้างอิงฉบับเต็มจาก Google Drive</p>
              <div className="mt-4 grid gap-3">
                <a
                  href="https://drive.google.com/file/d/12EJGtv2_nnK5zpj5Mj2Oe93hPrd3anFG/view?usp=sharing"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-800 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-800"
                >
                  ประกาศกรมคุมโรค เรื่อง นโยบายการคุ้มครองข้อมูลส่วนบุคคล (Privacy Policy) กรมควบคุมโรค
                </a>
                <a
                  href="https://drive.google.com/file/d/19RlKfV1ksHoArULfQf6snLOVVG0xvhYw/view?usp=sharing"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-800 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-800"
                >
                  ประกาศกรมคุมโรค เรื่อง คำประกาศเกี่ยวกับความเป็นส่วนตัว (Privacy Notice) กรมควบคุมโรค
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-pink-100 bg-pink-50 px-5 py-4 text-sm leading-6 text-pink-950">
          <p className="font-semibold">การเข้าสู่ระบบ SmartDSP ถือว่าผู้ใช้งานได้รับทราบประกาศความเป็นส่วนตัวฉบับนี้แล้ว
            และยินยอมให้ระบบประมวลผลข้อมูลเท่าที่จำเป็นต่อการให้บริการและการปฏิบัติงานของหน่วยงาน</p>
        </section>

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
                      {section.items.map((item) => (
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

        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">ตัวอย่างข้อความยอมรับ</p>
            <p className="mt-1 text-sm text-slate-600">ข้าพเจ้าได้อ่านและรับทราบ Privacy Notice สำหรับการใช้งานระบบ SmartDSP แล้ว</p>
          </div>
          <Link to="/login" className="inline-flex items-center justify-center rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-700">
            กลับไปเข้าสู่ระบบ
          </Link>
        </div>

        <LegalFooter />
      </main>
    </div>
  );
}