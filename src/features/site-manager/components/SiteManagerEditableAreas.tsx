import { ArrowRight } from 'lucide-react';
import type { SiteManagerContentStatus, SiteManagerEditableArea } from '../types/siteManager.types';

const statusClass: Record<SiteManagerContentStatus, string> = {
  published: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  draft: 'bg-slate-100 text-slate-700 ring-slate-200',
  scheduled: 'bg-amber-50 text-amber-700 ring-amber-200',
};

const statusLabel: Record<SiteManagerContentStatus, string> = {
  published: 'Published',
  draft: 'Draft',
  scheduled: 'Scheduled',
};

type SiteManagerEditableAreasProps = {
  areas: SiteManagerEditableArea[];
};

export function SiteManagerEditableAreas({ areas }: SiteManagerEditableAreasProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-lg font-semibold tracking-normal text-slate-950">พื้นที่จัดการเนื้อหา</h2>
        <p className="mt-1 text-sm text-slate-500">โครงนี้แยกไว้เพื่อเชื่อมระบบบันทึกข้อมูลในขั้นถัดไป</p>
      </div>

      <div className="divide-y divide-slate-100">
        {areas.map((area) => {
          const Icon = area.icon;
          return (
            <article key={area.title} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-50 text-brand-700 ring-1 ring-slate-200">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold tracking-normal text-slate-950">{area.title}</h3>
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ${statusClass[area.status]}`}>
                      {statusLabel[area.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{area.description}</p>
                  <p className="mt-2 text-xs font-medium text-slate-500">อัปเดตล่าสุด: {area.updatedAt}</p>
                </div>
              </div>

              <button
                type="button"
                className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                เตรียมแก้ไข
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
