import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Newspaper, X } from 'lucide-react';
import type { HomeFaqItem, HomeNewsItem, HomePlanSection } from '../types/publicHome.types';

type MobileSectionId = string;

type HomeMobileSectionLauncherProps = {
  planSections: HomePlanSection[];
  news: HomeNewsItem[];
  faqs: HomeFaqItem[];
};

type CoverPreviewState = {
  title: string;
  imageUrl: string;
};

const mobileSectionToneClass: Record<string, { icon: string; panel: string; text: string; action: string }> = {
  emerald: {
    icon: 'bg-[#087446] text-white',
    panel: 'border-[#7BC5A4] bg-[#EAF5F0]',
    text: 'text-[#087446]',
    action: 'border-[#7BC5A4] text-[#087446]',
  },
  rose: {
    icon: 'bg-[#F54A85] text-white',
    panel: 'border-[#F7A5C2] bg-[#FDF0F5]',
    text: 'text-[#F54A85]',
    action: 'border-[#F7A5C2] text-[#F54A85]',
  },
  blue: {
    icon: 'bg-[#2A7DDA] text-white',
    panel: 'border-[#A7C9F0] bg-[#EEF5FD]',
    text: 'text-[#2A7DDA]',
    action: 'border-[#A7C9F0] text-[#2A7DDA]',
  },
  violet: {
    icon: 'bg-[#6E42C1] text-white',
    panel: 'border-[#C8B4E8] bg-[#F3EFFB]',
    text: 'text-[#6E42C1]',
    action: 'border-[#C8B4E8] text-[#6E42C1]',
  },
  orange: {
    icon: 'bg-[#F57C00] text-white',
    panel: 'border-[#F9C28A] bg-[#FFF4EC]',
    text: 'text-[#F57C00]',
    action: 'border-[#F9C28A] text-[#F57C00]',
  },
  slate: {
    icon: 'bg-slate-700 text-white',
    panel: 'border-slate-200 bg-white',
    text: 'text-slate-700',
    action: 'border-slate-200 text-slate-700',
  },
};

const mobileSectionShortLabels: Record<string, string> = {
  'plan-levels': 'แผนระดับ',
  'disease-control-plan': 'แผนควบคุมโรค',
  'annual-guidelines': 'แนวทางประจำปี',
  'risk-management': 'บริหารความเสี่ยง',
  'executive-policy': 'นโยบายผู้บริหาร',
  'r2r-research': 'งานวิจัย R2R',
  'public-news': 'ข่าวล่าสุด',
  'public-faq': 'คำถามที่พบบ่อย',
};

const twoLineClampStyle = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
} as const;

function getMobileCardsPerPage(width: number) {
  return width >= 640 ? 2 : 1;
}

export function HomeMobileSectionLauncher({ planSections, news, faqs }: HomeMobileSectionLauncherProps) {
  const [activeSectionId, setActiveSectionId] = useState<MobileSectionId | null>(null);
  const [cardsPerPage, setCardsPerPage] = useState(() =>
    typeof window === 'undefined' ? 1 : getMobileCardsPerPage(window.innerWidth),
  );
  const [sectionPages, setSectionPages] = useState<Record<string, number>>({});
  const [coverPreview, setCoverPreview] = useState<CoverPreviewState | null>(null);
  const sectionCardCounts = useMemo(
    () => planSections.map((section) => `${section.id}:${section.cards.length}`).join('|'),
    [planSections],
  );

  useEffect(() => {
    const updateCardsPerPage = () => setCardsPerPage(getMobileCardsPerPage(window.innerWidth));

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

      planSections.forEach((section) => {
        const totalPages = Math.max(1, Math.ceil(section.cards.length / cardsPerPage));
        const currentPage = nextPages[section.id] || 0;

        if (currentPage >= totalPages) {
          nextPages[section.id] = totalPages - 1;
          changed = true;
        }
      });

      return changed ? nextPages : currentPages;
    });
  }, [cardsPerPage, sectionCardCounts, planSections]);

  const goToSectionPage = (sectionId: string, totalPages: number, direction: 'previous' | 'next') => {
    setSectionPages((currentPages) => {
      const currentPage = currentPages[sectionId] || 0;
      const nextPage = direction === 'next'
        ? Math.min(currentPage + 1, totalPages - 1)
        : Math.max(currentPage - 1, 0);

      return { ...currentPages, [sectionId]: nextPage };
    });
  };

  const sectionItems = [
    ...planSections.map((section) => ({
      id: section.id,
      label: section.title,
      shortLabel: mobileSectionShortLabels[section.id] || section.title,
      tone: section.tone,
      icon: section.cards[0]?.icon,
      type: 'plan' as const,
      section,
    })),
    {
      id: 'public-news',
      label: 'ข่าวประชาสัมพันธ์ล่าสุด',
      shortLabel: mobileSectionShortLabels['public-news'],
      tone: 'slate',
      icon: Newspaper,
      type: 'news' as const,
      section: null,
    },
    {
      id: 'public-faq',
      label: 'คำถามที่พบบ่อย',
      shortLabel: mobileSectionShortLabels['public-faq'],
      tone: 'slate',
      icon: CircleHelp,
      type: 'faq' as const,
      section: null,
    },
  ];
  const activeSection = sectionItems.find((item) => item.id === activeSectionId);
  const activeTone = activeSection
    ? mobileSectionToneClass[activeSection.tone] || mobileSectionToneClass.slate
    : mobileSectionToneClass.slate;

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
                <span className="text-[11px] font-semibold leading-4 text-slate-800" style={twoLineClampStyle} title={item.label}>
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>

        {activeSection ? (
          <div className={`mt-4 rounded-md border p-4 ${activeTone.panel}`}>
            <div className="flex items-center justify-between gap-3">
              <h2
                className={`text-base font-semibold tracking-normal ${activeTone.text}`}
                style={twoLineClampStyle}
                title={activeSection.label}
              >
                {activeSection.label}
              </h2>
              <ChevronDown className="h-5 w-5 rotate-180 text-slate-500" aria-hidden="true" />
            </div>

            {activeSection.type === 'plan' && activeSection.section ? (() => {
              const currentPage = sectionPages[activeSection.id] || 0;
              const totalPages = Math.max(1, Math.ceil(activeSection.section.cards.length / cardsPerPage));
              const visibleCards = activeSection.section.cards.slice(currentPage * cardsPerPage, currentPage * cardsPerPage + cardsPerPage);
              const canGoPrevious = currentPage > 0;
              const canGoNext = currentPage < totalPages - 1;
              const cardGridStyle = {
                gridTemplateColumns: `repeat(${Math.max(1, Math.min(cardsPerPage, visibleCards.length))}, minmax(0, 1fr))`,
              };

              return (
                <div className="mt-4">
                  {totalPages > 1 ? (
                    <div className="mb-3 flex items-center justify-end gap-2">
                      <span className={`text-xs font-semibold ${activeTone.text}`}>
                        {currentPage + 1}/{totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => goToSectionPage(activeSection.id, totalPages, 'previous')}
                        disabled={!canGoPrevious}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-md border bg-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${activeTone.action}`}
                        aria-label={`ย้อนกลับ ${activeSection.label}`}
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => goToSectionPage(activeSection.id, totalPages, 'next')}
                        disabled={!canGoNext}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-md border bg-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${activeTone.action}`}
                        aria-label={`ถัดไป ${activeSection.label}`}
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}

                  <div className="grid gap-3" style={cardGridStyle}>
                    {visibleCards.map((card, cardIndex) => {
                      const Icon = card.icon;
                      const coverImageLayout = card.coverImageLayout === 'landscape' ? 'landscape' : 'portrait';
                      const coverAspectClass = coverImageLayout === 'landscape' ? 'aspect-[16/9]' : 'aspect-[9/16]';
                      const ActionElement = card.pdfUrl ? 'a' : 'button';
                      const absoluteCardIndex = currentPage * cardsPerPage + cardIndex;

                      return (
                        <div
                          key={`${activeSection.id}-${card.title}-${card.subtitle}-${absoluteCardIndex}`}
                          className="flex min-h-36 flex-col items-center justify-start rounded-md border border-white/80 bg-white p-3 text-center text-slate-900 shadow-sm"
                        >
                          {card.coverImageUrl ? (
                            <button
                              type="button"
                              onClick={() => setCoverPreview({ title: card.title, imageUrl: card.coverImageUrl || '' })}
                              className={`${coverAspectClass} w-full max-w-[74px] overflow-hidden rounded-md border border-slate-200 bg-slate-100 transition hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400`}
                              aria-label={`ดูภาพหน้าปก ${card.title} ขนาดใหญ่`}
                            >
                              <img src={card.coverImageUrl} alt={`ภาพหน้าปก ${card.title}`} className="h-full w-full object-cover" />
                            </button>
                          ) : (
                            <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.color} text-white`}>
                              <Icon className="h-5 w-5" aria-hidden="true" />
                            </span>
                          )}
                          <ActionElement
                            {...(card.pdfUrl
                              ? { href: card.pdfUrl, target: '_blank', rel: 'noreferrer' }
                              : { type: 'button' })}
                            className="mt-3 grid w-full justify-items-center gap-1 rounded-md px-2 py-1 text-center transition hover:bg-slate-50"
                          >
                            <span className="text-xs font-semibold leading-5">{card.title}</span>
                            <span className="text-[11px] leading-4 text-slate-500">{card.subtitle}</span>
                          </ActionElement>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })() : null}

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
              <h3 className="truncate text-sm font-semibold">{coverPreview.title}</h3>
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
