import type { HomeQuickNavItem } from '../types/publicHome.types';
import { scrollToHomeSection } from '../utils/scrollToHomeSection';

type HomeQuickNavProps = {
  items: HomeQuickNavItem[];
};

export function HomeQuickNav({ items }: HomeQuickNavProps) {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.targetId}
                type="button"
                onClick={() => scrollToHomeSection(item.targetId)}
                className="inline-flex min-w-max items-center gap-2 rounded-md border border-fuchsia-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-fuchsia-50 hover:text-fuchsia-700"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
