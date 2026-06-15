import type { HomeFaqItem } from '../types/publicHome.types';

type HomeFaqSectionProps = {
  faqs: HomeFaqItem[];
};

export function HomeFaqSection({ faqs }: HomeFaqSectionProps) {
  return (
    <section id="public-faq" className="scroll-mt-24 bg-slate-50 py-12 sm:py-16">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div>
          <p className="text-sm font-semibold text-brand-700">FAQ</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">คำถามที่พบบ่อย</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            ส่วนนี้เตรียมไว้สำหรับข้อมูลช่วยเหลือผู้ใช้งานหน้า Home และช่องทางเข้าสู่ระบบ
          </p>
        </div>

        <div className="grid gap-3">
          {faqs.map((faq) => (
            <article key={faq.question} className="rounded-md border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold tracking-normal text-slate-950">{faq.question}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
