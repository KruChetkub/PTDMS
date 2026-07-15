const workflowSteps = [
  'สร้างหรือแก้ไขเนื้อหา',
  'ตรวจสอบภาพตัวอย่างบนหน้า Home',
  'กำหนดสถานะ Draft หรือ Published',
  'เผยแพร่ให้ผู้ใช้งานเห็นหน้าเว็บ',
];

const imagePlanSteps = [
  'ช่วงตรวจ UI ใช้ URL รูปภาพก่อน',
  'ระยะฐานข้อมูลจริงใช้',
  'เก็บเฉพาะ URL และ metadata ใน site_content_documents',
];

export function SiteManagerWorkflowPanel() {
  return (
    <section className="rounded-md border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
      <h2 className="text-lg font-semibold tracking-normal">แนวทาง workflow</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        หน้านี้เป็นฐานสำหรับระบบจัดการเว็บไซต์ แยกจาก feature อื่น เพื่อให้ขยายเป็นฐานข้อมูลจริงได้โดยไม่กระทบ Dashboard
      </p>
      <ol className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <li key={step} className="flex gap-3 rounded-md bg-white/5 p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-sm font-bold text-slate-950">
              {index + 1}
            </span>
            <span className="pt-1 text-sm text-slate-100">{step}</span>
          </li>
        ))}
      </ol>

      <div className="mt-6 border-t border-white/10 pt-5">
        <h3 className="text-sm font-semibold tracking-normal text-cyan-100">แผนจัดการรูปภาพ</h3>
        <ul className="mt-3 grid gap-2 md:grid-cols-3">
          {imagePlanSteps.map((step) => (
            <li key={step} className="rounded-md bg-white/5 p-3 text-sm leading-6 text-slate-300">
              {step}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
