import { ArrowLeft, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LegalFooter } from './LegalFooter';
import { PrivacyNoticeIntro, PrivacyNoticeSummary } from './PrivacyNoticeContent';

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
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600"></p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600"></div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <PrivacyNoticeIntro />

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
          <p className="font-semibold">
            การเข้าสู่ระบบ SmartDSP ถือว่าผู้ใช้งานได้รับทราบประกาศความเป็นส่วนตัวฉบับนี้แล้ว
            และยินยอมให้ระบบประมวลผลข้อมูลเท่าที่จำเป็นต่อการให้บริการและการปฏิบัติงานของหน่วยงาน
          </p>
        </section>

        <PrivacyNoticeSummary />

        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">ข้อความยอมรับ</p>
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
