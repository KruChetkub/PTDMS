import type { HomeQuickNavItem } from '../types/publicHome.types';
import { scrollToHomeSection } from '../utils/scrollToHomeSection';

type HomeQuickNavProps = {
  items: HomeQuickNavItem[];
};

const quickNavToneClass: Record<string, string> = {
  'plan-levels': 'border-[#7BC5A4] text-[#087446] hover:bg-[#EAF5F0]',
  'disease-control-plan': 'border-[#F7A5C2] text-[#F54A85] hover:bg-[#FDF0F5]',
  'annual-guidelines': 'border-[#A7C9F0] text-[#2A7DDA] hover:bg-[#EEF5FD]',
  'risk-management': 'border-[#C8B4E8] text-[#6E42C1] hover:bg-[#F3EFFB]',
  'executive-policy': 'border-[#F9C28A] text-[#F57C00] hover:bg-[#FFF4EC]',
  'public-news': 'border-slate-300 text-slate-700 hover:bg-slate-50',
};

export function HomeQuickNav({ items }: HomeQuickNavProps) {
  return (
    <section className="border-b border-slate-200 bg-white lg:hidden">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.targetId}
                type="button"
                onClick={() => scrollToHomeSection(item.targetId)}
                className={`inline-flex min-w-max items-center gap-2 rounded-md border bg-white px-4 py-3 text-sm font-semibold transition ${
                  quickNavToneClass[item.targetId] || quickNavToneClass['public-news']
                }`}
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
