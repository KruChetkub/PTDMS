import type { SiteManagerSummaryItem } from '../types/siteManager.types';

type SiteManagerSummaryGridProps = {
  items: SiteManagerSummaryItem[];
};

export function SiteManagerSummaryGrid({ items }: SiteManagerSummaryGridProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <article key={item.label} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">{item.value}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">{item.detail}</p>
          </article>
        );
      })}
    </section>
  );
}
