import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
  sectionId?: string;
  showPlanBanner?: boolean;
  heading?: string;
  description?: string;
  showSectionNumbers?: boolean;
};

type CoverPreviewState = {
  title: string;
  imageUrl: string;
};

function getCardsPerPage(width: number) {
  if (width >= 1024) return 4;
  if (width >= 640) return 2;
  return 1;
}

export function HomePlanSections({
  sections,
  logoUrl,
  sectionId,
  showPlanBanner = true,
  heading,
  description,
  showSectionNumbers = true,
}: HomePlanSectionsProps) {
  const [cardsPerPage, setCardsPerPage] = useState(() =>
    typeof window === 'undefined' ? 4 : getCardsPerPage(window.innerWidth),
  );
  const [sectionPages, setSectionPages] = useState<Record<string, number>>({});
  const [coverPreview, setCoverPreview] = useState<CoverPreviewState | null>(null);
  const sectionCardCounts = useMemo(
    () => sections.map((section) => `${section.id}:${section.cards.length}`).join('|'),
    [sections],
  );

  useEffect(() => {
    const updateCardsPerPage = () => setCardsPerPage(getCardsPerPage(window.innerWidth));

    updateCardsPerPage();
    window.addEventListener('resize', updateCardsPerPage);

    return () => window.removeEventListener('resize', updateCardsPerPage);
  }, []);

  useEffect(() => {
    if (!coverPreview) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCoverPreview(null);
    };

    document.addEventListener('keydown', handleEscape);

    return () => document.removeEventListener('keydown', handleEscape);
  }, [coverPreview]);

  useEffect(() => {
    setSectionPages((currentPages) => {
      let changed = false;
      const nextPages = { ...currentPages };

      sections.forEach((section) => {
        const totalPages = Math.max(1, Math.ceil(section.cards.length / cardsPerPage));
        const currentPage = nextPages[section.id] || 0;

        if (currentPage >= totalPages) {
          nextPages[section.id] = totalPages - 1;
          changed = true;
        }
      });

      return changed ? nextPages : currentPages;
    });
  }, [cardsPerPage, sectionCardCounts, sections]);

  const goToSectionPage = (sectionId: string, totalPages: number, direction: 'previous' | 'next') => {
    setSectionPages((currentPages) => {
      const currentPage = currentPages[sectionId] || 0;
      const nextPage = direction === 'next'
        ? Math.min(currentPage + 1, totalPages - 1)
        : Math.max(currentPage - 1, 0);

      return { ...currentPages, [sectionId]: nextPage };
    });
  };

  return (
    <section id={sectionId} className="scroll-mt-20 bg-slate-50 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {showPlanBanner ? <HomePlanLevelsBanner logoUrl={logoUrl} /> : null}

        {heading ? (
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="mt-1 text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">{heading}</h2>
              {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
            </div>
          </div>
        ) : null}

        <div className={`${showPlanBanner ? 'mt-8' : 'mt-0'} grid gap-5`}>
          {sections.map((section, sectionIndex) => {
            const tone = sectionToneClass[section.tone] || sectionToneClass.emerald;
            const currentPage = sectionPages[section.id] || 0;
            const totalPages = Math.max(1, Math.ceil(section.cards.length / cardsPerPage));
            const visibleCards = section.cards.slice(currentPage * cardsPerPage, currentPage * cardsPerPage + cardsPerPage);
            const canGoPrevious = currentPage > 0;
            const canGoNext = currentPage < totalPages - 1;
            const visibleColumnCount = Math.max(1, Math.min(cardsPerPage, visibleCards.length));
            const cardGridStyle = {
              gridTemplateColumns: `repeat(${visibleColumnCount}, minmax(0, 1fr))`,
            };

            return (
              <RevealOnScroll key={section.id} delayMs={sectionIndex * 140}>
                <article
                  id={sectionId === section.id || section.id === 'plan-levels' ? undefined : section.id}
                  className={`scroll-mt-24 rounded-md p-[2px] ${tone.border} ${tone.shadow}`}
                >
                  <div className={`rounded-md p-4 sm:p-5 ${tone.body}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {showSectionNumbers ? (
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg font-bold shadow-sm ring-1 ${tone.badge}`}>
                            {section.number}
                          </span>
                        ) : null}
                        <h3 className="text-xl font-semibold tracking-normal">{section.title}</h3>
                      </div>

                      {totalPages > 1 ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-current/70">
                            {currentPage + 1}/{totalPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => goToSectionPage(section.id, totalPages, 'previous')}
                            disabled={!canGoPrevious}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/70 bg-white text-current shadow-sm transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`ย้อนกลับ ${section.title}`}
                          >
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => goToSectionPage(section.id, totalPages, 'next')}
                            disabled={!canGoNext}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/70 bg-white text-current shadow-sm transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`ถัดไป ${section.title}`}
                          >
                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-5 grid gap-4" style={cardGridStyle}>
                      {visibleCards.map((card, cardIndex) => {
                        const Icon = card.icon;
                        const coverImageLayout = card.coverImageLayout === 'landscape' ? 'landscape' : 'portrait';
                        const coverAspectClass = coverImageLayout === 'landscape' ? 'aspect-[19/12]' : 'aspect-[13/20]';
                        const ActionElement = card.pdfUrl ? 'a' : 'button';
                        const absoluteCardIndex = currentPage * cardsPerPage + cardIndex;

                        return (
                          <div
                            key={`${section.id}-${card.title}-${card.subtitle}-${absoluteCardIndex}`}
                            className={`flex min-h-64 flex-col rounded-md border bg-white p-4 text-center text-slate-900 shadow-sm ${tone.card}`}
                          >
                            {card.coverImageUrl ? (
                              <button
                                type="button"
                                onClick={() => setCoverPreview({ title: card.title, imageUrl: card.coverImageUrl || '' })}
                                className={`group mx-auto ${coverAspectClass} w-full max-w-[200px] overflow-hidden rounded-md border border-slate-200 bg-slate-100 transition hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400`}
                                aria-label={`ดูภาพหน้าปก ${card.title} ขนาดใหญ่`}
                              >
                                <span className="relative block h-full w-full">
                                  <img src={card.coverImageUrl} alt={`ภาพหน้าปก ${card.title}`} className="h-full w-full object-cover" />
                                  <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-xs font-semibold text-white opacity-0 transition group-hover:bg-slate-950/35 group-hover:opacity-100">
                                    ดูภาพ
                                  </span>
                                </span>
                              </button>
                            ) : (
                              <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${card.color} text-white`}>
                                <Icon className="h-7 w-7" aria-hidden="true" />
                              </div>
                            )}
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

      {coverPreview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`ภาพหน้าปก ${coverPreview.title}`}
          onClick={() => setCoverPreview(null)}
        >
          <div className="relative flex max-h-full max-w-full flex-col items-center gap-3" onClick={(event) => event.stopPropagation()}>
            <div className="flex w-full max-w-[96vw] items-center justify-between gap-3 text-white">
              <h3 className="truncate text-sm font-semibold sm:text-base">{coverPreview.title}</h3>
              <button
                type="button"
                onClick={() => setCoverPreview(null)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/10 text-white transition hover:bg-white/20"
                aria-label="ปิดภาพหน้าปก"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <img
              src={coverPreview.imageUrl}
              alt={`ภาพหน้าปก ${coverPreview.title}`}
              className="max-h-[88vh] max-w-[96vw] rounded-md bg-white object-contain shadow-2xl"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
