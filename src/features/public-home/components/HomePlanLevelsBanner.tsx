import { ArrowRight, Building2, ClipboardList, Flag, Landmark, Network } from 'lucide-react';

type HomePlanLevelsBannerProps = {
  logoUrl: string;
};

const planLevels = [
  { label: 'ยุทธศาสตร์ชาติ', detail: 'ทิศทางระยะยาว', icon: Landmark },
  { label: 'แผนแม่บท', detail: 'ประเด็นขับเคลื่อน', icon: Network },
  { label: 'แผนปฏิรูปประเทศ', detail: 'กลไกการปรับระบบ', icon: Flag },
  { label: 'แผนกรม', detail: 'เป้าหมายหน่วยงาน', icon: Building2 },
  { label: 'แผนปฏิบัติราชการ', detail: 'นำสู่การปฏิบัติ', icon: ClipboardList },
];

export function HomePlanLevelsBanner({ logoUrl }: HomePlanLevelsBannerProps) {
  return (
    <div id="plan-levels" className="scroll-mt-24 overflow-hidden rounded-md border border-cyan-100 bg-white shadow-sm">
      <div className="relative isolate overflow-hidden bg-[linear-gradient(115deg,#083B78_0%,#0B79D0_48%,#14B8A6_100%)] px-5 py-5 text-white sm:px-6">
        <div className="absolute inset-x-0 bottom-0 h-16 overflow-hidden" aria-hidden="true">
          <div className="absolute -bottom-12 left-[-8%] h-24 w-[116%] rounded-[50%] border-t-2 border-white/70" />
          <div className="absolute -bottom-6 left-[-12%] h-24 w-[124%] rounded-[50%] border-t-2 border-cyan-100/80" />
        </div>
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <img src={logoUrl} alt="กรมควบคุมโรค" className="h-12 w-12 shrink-0 rounded-md bg-white p-1.5 object-contain shadow-sm" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100">Strategic Map</p>
              <h2 className="text-xl font-bold tracking-normal text-white">ความเชื่อมโยงของแผนสู่การปฏิบัติ</h2>
            </div>
          </div>
          <p className="max-w-md text-sm leading-6 text-cyan-50/90">
            มองเห็นลำดับของเอกสารจากระดับนโยบายสู่แผนงานที่ใช้ขับเคลื่อนภารกิจกรมควบคุมโรค
          </p>
        </div>
      </div>

      <div className="grid gap-3 bg-white p-4 sm:p-5 lg:grid-cols-5">
        {planLevels.map((level, index) => {
          const Icon = level.icon;
          return (
            <div key={level.label} className="relative rounded-md border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start gap-3 lg:block">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 lg:mt-3">
                  <p className="text-sm font-bold leading-5 text-slate-950">{level.label}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{level.detail}</p>
                </div>
              </div>
              {index < planLevels.length - 1 ? (
                <ArrowRight className="absolute -right-5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-cyan-500 lg:block" aria-hidden="true" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
