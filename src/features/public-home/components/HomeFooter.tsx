import { homeBrandHighlights } from '../data/publicHome.mock';

export function HomeFooter() {
  return (
    <footer className="bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5 border-b border-white/10 pb-8 sm:grid-cols-2 lg:grid-cols-4">
          {homeBrandHighlights.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10 text-cyan-200">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-white/85">{item.label}</p>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col justify-between gap-3 pt-6 sm:flex-row sm:items-center">
          <div>
            <div className="text-base font-semibold">SmartDSP</div>
            <p className="mt-1 text-sm text-white/60">กองยุทธศาสตร์และแผนงาน</p>
          </div>
          <p className="text-sm text-white/60">Public Home structure prepared for future Site Manager content.</p>
        </div>
      </div>
    </footer>
  );
}
