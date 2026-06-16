import { useState } from 'react';
import { ChevronDown, CircleHelp, Newspaper } from 'lucide-react';
import type { HomeFaqItem, HomeNewsItem, HomePlanSection } from '../types/publicHome.types';

type MobileSectionId = string;

type HomeMobileSectionLauncherProps = {
  planSections: HomePlanSection[];
  news: HomeNewsItem[];
  faqs: HomeFaqItem[];
};

const mobileSectionToneClass: Record<string, { icon: string; panel: string; text: string }> = {
  emerald: {
    icon: 'bg-[#087446] text-white',
    panel: 'border-[#7BC5A4] bg-[#EAF5F0]',
    text: 'text-[#087446]',
  },
  rose: {
    icon: 'bg-[#F54A85] text-white',
    panel: 'border-[#F7A5C2] bg-[#FDF0F5]',
    text: 'text-[#F54A85]',
  },
  blue: {
    icon: 'bg-[#2A7DDA] text-white',
    panel: 'border-[#A7C9F0] bg-[#EEF5FD]',
    text: 'text-[#2A7DDA]',
  },
  violet: {
    icon: 'bg-[#6E42C1] text-white',
    panel: 'border-[#C8B4E8] bg-[#F3EFFB]',
    text: 'text-[#6E42C1]',
  },
  orange: {
    icon: 'bg-[#F57C00] text-white',
    panel: 'border-[#F9C28A] bg-[#FFF4EC]',
    text: 'text-[#F57C00]',
  },
  slate: {
    icon: 'bg-slate-700 text-white',
    panel: 'border-slate-200 bg-white',
    text: 'text-slate-700',
  },
};

export function HomeMobileSectionLauncher({ planSections, news, faqs }: HomeMobileSectionLauncherProps) {
  const [activeSectionId, setActiveSectionId] = useState<MobileSectionId | null>(null);
  const sectionItems = [
    ...planSections.map((section) => ({
      id: section.id,
      label: section.title,
      tone: section.tone,
      icon: section.cards[0]?.icon,
      type: 'plan' as const,
      section,
    })),
    {
      id: 'public-news',
      label: 'ข่าวประชาสัมพันธ์ล่าสุด',
      tone: 'slate',
      icon: Newspaper,
      type: 'news' as const,
      section: null,
    },
    {
      id: 'public-faq',
      label: 'คำถามที่พบบ่อย',
      tone: 'slate',
      icon: CircleHelp,
      type: 'faq' as const,
      section: null,
    },
  ];
  const activeSection = sectionItems.find((item) => item.id === activeSectionId);

  return (
    <section className="bg-slate-50 px-4 py-6 lg:hidden">
      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-4 gap-3">
          {sectionItems.map((item) => {
            const Icon = item.icon || CircleHelp;
            const tone = mobileSectionToneClass[item.tone] || mobileSectionToneClass.slate;
            const isActive = activeSectionId === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSectionId(isActive ? null : item.id)}
                className={`flex min-h-24 flex-col items-center justify-start gap-2 rounded-md border px-2 py-3 text-center transition ${
                  isActive ? `${tone.panel} shadow-sm` : 'border-transparent bg-slate-50 hover:bg-slate-100'
                }`}
                aria-expanded={isActive}
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone.icon}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-[11px] font-semibold leading-4 text-slate-800">{item.label}</span>
              </button>
            );
          })}
        </div>

        {activeSection ? (
          <div className={`mt-4 rounded-md border p-4 ${mobileSectionToneClass[activeSection.tone]?.panel || mobileSectionToneClass.slate.panel}`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className={`text-base font-semibold tracking-normal ${mobileSectionToneClass[activeSection.tone]?.text || 'text-slate-800'}`}>
                {activeSection.label}
              </h2>
              <ChevronDown className="h-5 w-5 rotate-180 text-slate-500" aria-hidden="true" />
            </div>

            {activeSection.type === 'plan' && activeSection.section ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {activeSection.section.cards.map((card, cardIndex) => {
                  const Icon = card.icon;
                  const ActionElement = card.pdfUrl ? 'a' : 'button';

                  return (
                    <ActionElement
                      key={`${activeSection.id}-${card.title}-${card.subtitle}-${cardIndex}`}
                      {...(card.pdfUrl
                        ? { href: card.pdfUrl, target: '_blank', rel: 'noreferrer' }
                        : { type: 'button' })}
                      className="flex min-h-36 flex-col items-center justify-start rounded-md border border-white/80 bg-white p-3 text-center text-slate-900 shadow-sm"
                    >
                      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.color} text-white`}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="mt-3 text-xs font-semibold leading-5">{card.title}</span>
                      <span className="mt-1 text-[11px] leading-4 text-slate-500">{card.subtitle}</span>
                    </ActionElement>
                  );
                })}
              </div>
            ) : null}

            {activeSection.type === 'news' ? (
              <div className="mt-4 grid gap-3">
                {news.map((item, index) => (
                  <article key={`${item.title}-${index}`} className="rounded-md border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                        {item.category}
                      </span>
                      <span className="text-[11px] text-slate-500">{item.dateLabel}</span>
                    </div>
                    <h3 className="mt-3 text-sm font-semibold leading-6 text-slate-950">{item.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{item.description}</p>
                  </article>
                ))}
              </div>
            ) : null}

            {activeSection.type === 'faq' ? (
              <div className="mt-4 grid gap-3">
                {faqs.map((faq, index) => (
                  <article key={`${faq.question}-${index}`} className="rounded-md border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-semibold leading-6 text-slate-950">{faq.question}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{faq.answer}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
