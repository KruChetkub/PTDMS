import { ArrowRight } from 'lucide-react';
import { HomePlanLevelsBanner } from './HomePlanLevelsBanner';
import { RevealOnScroll } from './RevealOnScroll';
import type { HomePlanSection } from '../types/publicHome.types';

const sectionToneClass: Record<string, string> = {
  emerald: 'bg-emerald-50/80 text-emerald-700',
  rose: 'bg-rose-50/80 text-rose-700',
  blue: 'bg-sky-50/80 text-sky-700',
  violet: 'bg-violet-50/80 text-violet-700',
  orange: 'bg-orange-50/80 text-orange-700',
};

type HomePlanSectionsProps = {
  sections: HomePlanSection[];
  logoUrl: string;
};

export function HomePlanSections({ sections, logoUrl }: HomePlanSectionsProps) {
  return (
    <section className="bg-slate-50 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <HomePlanLevelsBanner logoUrl={logoUrl} />

        <div className="mt-8 grid gap-5">
          {sections.map((section, sectionIndex) => (
            <RevealOnScroll key={section.id} delayMs={sectionIndex * 140}>
              <article
                id={section.id === 'plan-levels' ? undefined : section.id}
                className="scroll-mt-24 rounded-[18px] bg-gradient-to-br from-fuchsia-500 via-pink-400 to-violet-500 p-[3px] shadow-[0_18px_40px_rgba(217,70,239,0.14)]"
              >
                <div className={`rounded-[15px] p-4 sm:p-5 ${sectionToneClass[section.tone] || sectionToneClass.emerald}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold shadow-sm ring-1 ring-fuchsia-100">
                      {section.number}
                    </span>
                    <h3 className="text-xl font-semibold tracking-normal">{section.title}</h3>
                  </div>

                  <div
                    className={`mt-5 grid gap-4 sm:grid-cols-2 ${
                      section.cards.length >= 7 ? 'lg:grid-cols-4 xl:grid-cols-7' : 'lg:grid-cols-2'
                    }`}
                  >
                    {section.cards.map((card) => {
                      const Icon = card.icon;
                      const ActionElement = card.pdfUrl ? 'a' : 'button';
                      return (
                        <div
                          key={`${section.id}-${card.title}`}
                          className="flex min-h-64 flex-col rounded-md border border-fuchsia-100 bg-white p-4 text-center text-slate-900 shadow-sm"
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
                            className="mt-auto inline-flex items-center justify-center gap-2 rounded-md border border-fuchsia-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-fuchsia-50 hover:text-fuchsia-700"
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
          ))}
        </div>
      </div>
    </section>
  );
}
