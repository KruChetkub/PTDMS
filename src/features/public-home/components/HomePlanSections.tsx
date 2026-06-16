import { ArrowRight } from 'lucide-react';
import { HomePlanLevelsBanner } from './HomePlanLevelsBanner';
import { RevealOnScroll } from './RevealOnScroll';
import type { HomePlanSection } from '../types/publicHome.types';

const sectionToneClass: Record<string, { border: string; body: string; badge: string; card: string; action: string; shadow: string }> = {
  emerald: {
    border: 'bg-[#087446]',
    body: 'bg-[#EAF5F0] text-[#087446]',
    badge: 'text-[#087446] ring-[#7BC5A4]',
    card: 'border-[#7BC5A4]/70',
    action: 'border-[#7BC5A4] text-[#087446] hover:bg-[#EAF5F0]',
    shadow: 'shadow-[0_18px_40px_rgba(8,116,70,0.14)]',
  },
  rose: {
    border: 'bg-[#F54A85]',
    body: 'bg-[#FDF0F5] text-[#F54A85]',
    badge: 'text-[#F54A85] ring-[#F7A5C2]',
    card: 'border-[#F7A5C2]/80',
    action: 'border-[#F7A5C2] text-[#F54A85] hover:bg-[#FDF0F5]',
    shadow: 'shadow-[0_18px_40px_rgba(245,74,133,0.14)]',
  },
  blue: {
    border: 'bg-[#2A7DDA]',
    body: 'bg-[#EEF5FD] text-[#2A7DDA]',
    badge: 'text-[#2A7DDA] ring-[#A7C9F0]',
    card: 'border-[#A7C9F0]/80',
    action: 'border-[#A7C9F0] text-[#2A7DDA] hover:bg-[#EEF5FD]',
    shadow: 'shadow-[0_18px_40px_rgba(42,125,218,0.14)]',
  },
  violet: {
    border: 'bg-[#6E42C1]',
    body: 'bg-[#F3EFFB] text-[#6E42C1]',
    badge: 'text-[#6E42C1] ring-[#C8B4E8]',
    card: 'border-[#C8B4E8]/80',
    action: 'border-[#C8B4E8] text-[#6E42C1] hover:bg-[#F3EFFB]',
    shadow: 'shadow-[0_18px_40px_rgba(110,66,193,0.14)]',
  },
  orange: {
    border: 'bg-[#F57C00]',
    body: 'bg-[#FFF4EC] text-[#F57C00]',
    badge: 'text-[#F57C00] ring-[#F9C28A]',
    card: 'border-[#F9C28A]/80',
    action: 'border-[#F9C28A] text-[#F57C00] hover:bg-[#FFF4EC]',
    shadow: 'shadow-[0_18px_40px_rgba(245,124,0,0.14)]',
  },
};

type HomePlanSectionsProps = {
  sections: HomePlanSection[];
  logoUrl: string;
};

function getPlanCardGridClass(cardCount: number) {
  if (cardCount <= 1) return 'lg:grid-cols-1';
  if (cardCount === 2) return 'lg:grid-cols-2';
  if (cardCount === 3) return 'lg:grid-cols-3';
  if (cardCount === 4) return 'lg:grid-cols-4';
  if (cardCount === 5) return 'lg:grid-cols-3 xl:grid-cols-5';
  if (cardCount === 6) return 'lg:grid-cols-3 xl:grid-cols-6';
  return 'lg:grid-cols-4 xl:grid-cols-7';
}

export function HomePlanSections({ sections, logoUrl }: HomePlanSectionsProps) {
  return (
    <section className="bg-slate-50 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <HomePlanLevelsBanner logoUrl={logoUrl} />

        <div className="mt-8 grid gap-5">
          {sections.map((section, sectionIndex) => {
            const tone = sectionToneClass[section.tone] || sectionToneClass.emerald;

            return (
              <RevealOnScroll key={section.id} delayMs={sectionIndex * 140}>
                <article
                  id={section.id === 'plan-levels' ? undefined : section.id}
                  className={`scroll-mt-24 rounded-md p-[2px] ${tone.border} ${tone.shadow}`}
                >
                  <div className={`rounded-md p-4 sm:p-5 ${tone.body}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold shadow-sm ring-1 ${tone.badge}`}>
                      {section.number}
                    </span>
                    <h3 className="text-xl font-semibold tracking-normal">{section.title}</h3>
                  </div>

                  <div className={`mt-5 grid gap-4 sm:grid-cols-2 ${getPlanCardGridClass(section.cards.length)}`}>
                    {section.cards.map((card, cardIndex) => {
                      const Icon = card.icon;
                      const ActionElement = card.pdfUrl ? 'a' : 'button';
                      return (
                        <div
                          key={`${section.id}-${card.title}-${card.subtitle}-${cardIndex}`}
                          className={`flex min-h-64 flex-col rounded-md border bg-white p-4 text-center text-slate-900 shadow-sm ${tone.card}`}
                        >
                          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${card.color} text-white`}>
                            <Icon className="h-7 w-7" aria-hidden="true" />
                          </div>
                          <h4 className="mt-4 text-sm font-semibold leading-6 tracking-normal">{card.title}</h4>
                          <p className="mt-2 text-sm text-slate-600">{card.subtitle}</p>
                          {card.description ? <p className="mt-1 text-xs text-slate-500">{card.description}</p> : null}
                          <ActionElement
                            {...(card.pdfUrl
                              ? { href: card.pdfUrl, target: '_blank', rel: 'noreferrer' }
                              : { type: 'button' })}
                            className={`mt-auto inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${tone.action}`}
                          >
                            {card.actionLabel}
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </ActionElement>
                        </div>
                      );
                    })}
                  </div>
                </div>
                </article>
              </RevealOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
