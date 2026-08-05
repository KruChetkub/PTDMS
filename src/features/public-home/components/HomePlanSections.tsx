import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, ExternalLink, FileText, Search, X } from 'lucide-react';
import { HomePlanLevelsBanner } from './HomePlanLevelsBanner';
import { PdfFirstPageCover } from './PdfFirstPageCover';
import { RevealOnScroll } from './RevealOnScroll';
import type { HomePlanCard, HomePlanSection } from '../types/publicHome.types';

const sectionToneClass: Record<string, { accent: string; soft: string; text: string; ring: string }> = {
  emerald: { accent: 'bg-[#11A37F]', soft: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-100' },
  rose: { accent: 'bg-[#F0528A]', soft: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-100' },
  blue: { accent: 'bg-[#0878D8]', soft: 'bg-sky-50', text: 'text-sky-700', ring: 'ring-sky-100' },
  violet: { accent: 'bg-[#7667D9]', soft: 'bg-violet-50', text: 'text-violet-700', ring: 'ring-violet-100' },
  orange: { accent: 'bg-[#F59E0B]', soft: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-100' },
};

type HomePlanSectionsProps = {
  sections: HomePlanSection[];
  logoUrl: string;
  sectionId?: string;
  showPlanBanner?: boolean;
  heading?: string;
  description?: string;
  showSectionNumbers?: boolean;
  displayMode?: 'grouped' | 'shelf';
};

type CoverPreviewState = {
  title: string;
  imageUrl: string;
};

type PlanCardOptions = {
  hideActionButton?: boolean;
  linkMediaToPdf?: boolean;
  prominentTitle?: boolean;
  hideSupportingText?: boolean;
};

type DragState = {
  pointerId: number;
  startX: number;
  scrollLeft: number;
  moved: boolean;
};

type ScoredCard = {
  section: HomePlanSection;
  card: HomePlanCard;
  cardIndex: number;
  score: number;
};

function getCardsPerPage(width: number) {
  if (width >= 1024) return 4;
  if (width >= 640) return 2;
  return 1;
}

function getShelfTitleClassName(title: string) {
  const compactClass = 'mt-4 flex min-h-[3.75rem] items-center justify-center overflow-hidden text-center font-bold leading-5 tracking-normal text-slate-950';

  if (title.length > 90) return `${compactClass} text-[11px] sm:text-xs`;
  if (title.length > 60) return `${compactClass} text-xs sm:text-sm`;
  if (title.length > 34) return `${compactClass} text-sm sm:text-base`;

  return `${compactClass} text-base sm:text-lg`;
}

function normalizeSearchText(value: string) {
  return value.toLocaleLowerCase('th-TH').replace(/\s+/g, ' ').trim();
}

function getSearchText(section: HomePlanSection, card: HomePlanCard) {
  return normalizeSearchText([section.title, card.title, card.subtitle, card.description].filter(Boolean).join(' '));
}

function isSubsequence(query: string, text: string) {
  let cursor = 0;
  for (const character of query) {
    cursor = text.indexOf(character, cursor);
    if (cursor === -1) return false;
    cursor += 1;
  }
  return true;
}

function scorePlanCard(section: HomePlanSection, card: HomePlanCard, query: string) {
  const text = getSearchText(section, card);
  if (!query) return 0;
  if (text.includes(query)) return 1000 + query.length;

  const tokens = query.split(' ').filter(Boolean);
  const tokenScore = tokens.reduce((score, token) => score + (text.includes(token) ? token.length * 24 : 0), 0);
  const characterScore = Array.from(new Set(query.replace(/\s/g, ''))).reduce((score, character) => score + (text.includes(character) ? 2 : 0), 0);
  const subsequenceScore = isSubsequence(query.replace(/\s/g, ''), text.replace(/\s/g, '')) ? 20 : 0;

  return tokenScore + characterScore + subsequenceScore;
}

export function HomePlanSections({
  sections,
  logoUrl,
  sectionId,
  showPlanBanner = true,
  heading,
  description,
  showSectionNumbers = true,
  displayMode = 'grouped',
}: HomePlanSectionsProps) {
  const [cardsPerPage, setCardsPerPage] = useState(() =>
    typeof window === 'undefined' ? 4 : getCardsPerPage(window.innerWidth),
  );
  const [sectionPages, setSectionPages] = useState<Record<string, number>>({});
  const [coverPreview, setCoverPreview] = useState<CoverPreviewState | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const dragStateRef = useRef<Record<string, DragState | null>>({});
  const sectionCardCounts = useMemo(
    () => sections.map((section) => `${section.id}:${section.cards.length}`).join('|'),
    [sections],
  );
  const normalizedSearchTerm = normalizeSearchText(searchTerm);
  const shelfSearchResult = useMemo(() => {
    if (!normalizedSearchTerm) {
      return { mode: 'all' as const, sections };
    }

    const directSections = sections
      .map((section) => ({
        ...section,
        cards: section.cards.filter((card) => {
          const text = getSearchText(section, card);
          const tokens = normalizedSearchTerm.split(' ').filter(Boolean);
          return text.includes(normalizedSearchTerm) || tokens.every((token) => text.includes(token));
        }),
      }))
      .filter((section) => section.cards.length > 0);

    if (directSections.length > 0) {
      return { mode: 'matched' as const, sections: directSections };
    }

    const nearestCards = sections
      .flatMap((section) => section.cards.map((card, cardIndex) => ({ section, card, cardIndex, score: scorePlanCard(section, card, normalizedSearchTerm) })))
      .sort((first, second) => second.score - first.score)
      .slice(0, 10);
    const fallbackCards = nearestCards.length > 0 ? nearestCards : sections.flatMap((section) => section.cards.map((card, cardIndex) => ({ section, card, cardIndex, score: 0 })));

    return {
      mode: 'nearby' as const,
      sections: [
        {
          id: 'nearby-search-results',
          number: '',
          title: 'รายการใกล้เคียง',
          tone: 'blue',
          cards: fallbackCards.map((item) => item.card),
        },
      ],
    };
  }, [normalizedSearchTerm, sections]);

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
    if (displayMode === 'shelf') return;

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
  }, [cardsPerPage, displayMode, sectionCardCounts, sections]);

  const goToSectionPage = (targetSectionId: string, totalPages: number, direction: 'previous' | 'next') => {
    setSectionPages((currentPages) => {
      const currentPage = currentPages[targetSectionId] || 0;
      const nextPage = direction === 'next'
        ? Math.min(currentPage + 1, totalPages - 1)
        : Math.max(currentPage - 1, 0);

      return { ...currentPages, [targetSectionId]: nextPage };
    });
  };

  const handleShelfPointerDown = (sectionKey: string, event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest('a, button')) return;

    event.preventDefault();
    document.body.style.userSelect = 'none';
    dragStateRef.current[sectionKey] = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleShelfPointerMove = (sectionKey: string, event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current[sectionKey];
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startX;
    if (Math.abs(deltaX) > 4) {
      dragState.moved = true;
      event.preventDefault();
    }
    event.currentTarget.scrollLeft = dragState.scrollLeft - deltaX;
  };

  const finishShelfDrag = (sectionKey: string, event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current[sectionKey];
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    document.body.style.userSelect = '';
    window.setTimeout(() => {
      dragStateRef.current[sectionKey] = null;
    }, 0);
  };

  const preventClickAfterDrag = (sectionKey: string, event: React.MouseEvent<HTMLDivElement>) => {
    if (dragStateRef.current[sectionKey]?.moved) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const renderPlanCard = (section: HomePlanSection, card: HomePlanCard, cardIndex: number, keyPrefix: string, options?: PlanCardOptions) => {
    const tone = sectionToneClass[section.tone] || sectionToneClass.emerald;
    const Icon = card.icon || FileText;
    const coverImageLayout = card.coverImageLayout === 'landscape' ? 'landscape' : 'portrait';
    const coverAspectClass = coverImageLayout === 'landscape' ? 'aspect-[19/12]' : 'aspect-[13/20]';
    const ActionElement = card.pdfUrl ? 'a' : 'button';
    const shouldLinkMediaToPdf = Boolean(options?.linkMediaToPdf && card.pdfUrl);
    const titleClassName = options?.prominentTitle
      ? getShelfTitleClassName(card.title)
      : 'mt-4 text-sm font-semibold leading-6 tracking-normal text-slate-950';

    return (
      <div
        key={`${keyPrefix}-${section.id}-${card.title}-${card.subtitle}-${cardIndex}`}
        className={`${options?.prominentTitle ? 'h-[360px]' : 'min-h-64'} group relative flex min-w-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-white p-4 text-center text-slate-900 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-xl`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#0878D8,#12B8B1)]" aria-hidden="true" />
        {card.pdfUrl ? <ExternalLink className="absolute right-4 top-4 h-4 w-4 text-slate-400 transition group-hover:text-cyan-600" aria-hidden="true" /> : null}

        {card.coverImageUrl ? (
          shouldLinkMediaToPdf ? (
            <a
              href={card.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`group/media mx-auto ${coverAspectClass} w-full max-w-[175px] shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100 shadow-sm transition hover:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300`}
              aria-label={`เปิดไฟล์ PDF ${card.title}`}
            >
              <span className="relative block h-full w-full">
                <img src={card.coverImageUrl} alt={`ภาพหน้าปก ${card.title}`} className="h-full w-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-xs font-semibold text-white opacity-0 transition group-hover/media:bg-slate-950/35 group-hover/media:opacity-100">
                  เปิด PDF
                </span>
              </span>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setCoverPreview({ title: card.title, imageUrl: card.coverImageUrl || '' })}
              className={`group/media mx-auto ${coverAspectClass} w-full max-w-[175px] shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100 shadow-sm transition hover:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300`}
              aria-label={`ดูภาพหน้าปก ${card.title} ขนาดใหญ่`}
            >
              <span className="relative block h-full w-full">
                <img src={card.coverImageUrl} alt={`ภาพหน้าปก ${card.title}`} className="h-full w-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-xs font-semibold text-white opacity-0 transition group-hover/media:bg-slate-950/35 group-hover/media:opacity-100">
                  ดูภาพ
                </span>
              </span>
            </button>
          )
        ) : card.pdfUrl ? (
          <a
            href={card.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`mx-auto ${coverAspectClass} w-full max-w-[175px] shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100 shadow-sm transition hover:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300`}
            aria-label={`เปิดไฟล์ PDF ${card.title}`}
          >
            <PdfFirstPageCover pdfUrl={card.pdfUrl} title={card.title} />
          </a>
        ) : (
          <div className="mx-auto flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-[linear-gradient(135deg,#0878D8,#12B8B1)] text-white shadow-sm">
            <Icon className="h-9 w-9" aria-hidden="true" />
          </div>
        )}

        <h4 className={titleClassName} style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{card.title}</h4>
        {!options?.hideSupportingText ? <p className="mt-2 max-h-10 overflow-hidden text-sm text-slate-600" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{card.subtitle}</p> : null}
        {!options?.hideSupportingText && card.description ? <p className="mt-1 max-h-12 overflow-hidden text-xs text-slate-500" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{card.description}</p> : null}

        {options?.hideActionButton ? null : (
          <ActionElement
            {...(card.pdfUrl
              ? { href: card.pdfUrl, target: '_blank', rel: 'noopener noreferrer' }
              : { type: 'button' })}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 transition hover:border-cyan-300 hover:bg-cyan-100"
          >
            {card.actionLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ActionElement>
        )}
      </div>
    );
  };

  const renderCompactShelfCard = (section: HomePlanSection, card: HomePlanCard, cardIndex: number, sectionKey: string) => {
    const Icon = card.icon || FileText;
    const ActionElement = card.pdfUrl ? 'a' : 'button';
    const isLandscapeCover = card.coverImageLayout === 'landscape';
    const compactCardClassName = isLandscapeCover
      ? 'flex w-[clamp(30rem,38vw,44rem)] shrink-0 snap-start gap-4 rounded-md bg-white/95 p-3 text-left text-slate-900 shadow-sm ring-1 ring-cyan-100/80 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg'
      : 'flex w-[clamp(23rem,29vw,33rem)] shrink-0 snap-start gap-4 rounded-md bg-white/95 p-3 text-left text-slate-900 shadow-sm ring-1 ring-cyan-100/80 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg';
    const compactCoverClassName = isLandscapeCover
      ? 'group/media relative h-36 w-56 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-300'
      : 'group/media relative h-44 w-28 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-300';
    const actionProps = card.pdfUrl
      ? { href: card.pdfUrl, target: '_blank', rel: 'noopener noreferrer' }
      : { type: 'button' as const };

    return (
      <div key={`${sectionKey}-${card.title}-${card.subtitle}-${cardIndex}`} className={compactCardClassName}>
        <ActionElement
          {...actionProps}
          className={compactCoverClassName}
          aria-label={`เปิดไฟล์ PDF ${card.title}`}
        >
          {card.coverImageUrl ? (
            <img src={card.coverImageUrl} alt={`ภาพหน้าปก ${card.title}`} className="h-full w-full object-cover" draggable={false} />
          ) : card.pdfUrl ? (
            <PdfFirstPageCover pdfUrl={card.pdfUrl} title={card.title} />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#0878D8,#12B8B1)] text-white">
              <Icon className="h-8 w-8" aria-hidden="true" />
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-xs font-semibold text-white opacity-0 transition group-hover/media:bg-slate-950/35 group-hover/media:opacity-100">
            เปิด PDF
          </span>
        </ActionElement>

        <div className="flex min-w-0 flex-1 flex-col pt-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-3 text-sm font-bold leading-6 text-[#073B74]" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
              {card.title}
            </h3>
            {card.pdfUrl ? (
              <a href={card.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-cyan-50 hover:text-cyan-700" aria-label={`เปิดไฟล์ PDF ${card.title}`}>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : null}
          </div>
          {card.subtitle ? <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-600">{card.subtitle}</p> : null}
          {card.description ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{card.description}</p> : null}
          <div className="mt-auto h-1.5 w-16 rounded-full bg-[linear-gradient(90deg,#0878D8,#12B8B1)]" aria-hidden="true" />
        </div>
      </div>
    );
  };

  return (
    <section id={sectionId} className="relative isolate scroll-mt-20 overflow-hidden bg-[linear-gradient(180deg,#F4FBFF_0%,#E9F8FA_46%,#F7FBFF_100%)] py-5 sm:py-7">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(8,120,216,0.10),rgba(18,184,177,0.12)_48%,rgba(255,255,255,0)_72%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(170deg,rgba(6,59,120,0.10)_0%,rgba(255,255,255,0)_58%)]" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 2xl:px-10">
        {showPlanBanner ? <HomePlanLevelsBanner logoUrl={logoUrl} /> : null}

        {heading ? (
          <div className="mb-6 mt-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-cyan-700">Document Repository</p>
              <h2 className="mt-1 text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">{heading}</h2>
              {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
            </div>
          </div>
        ) : null}

        {displayMode === 'shelf' ? (
          <div className={`${showPlanBanner ? 'mt-8' : 'mt-0'} space-y-6`}>
            <div className="relative max-w-4xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ค้นหาแผนในระบบ"
                className="h-10 w-full rounded-md border border-cyan-100 bg-white/95 pl-10 pr-3 text-sm font-medium text-slate-900 shadow-sm outline-none backdrop-blur transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
              />
            </div>
            {shelfSearchResult.mode === 'nearby' ? <p className="text-xs font-semibold text-slate-500">แสดงรายการใกล้เคียง</p> : null}

            {shelfSearchResult.sections.map((section, sectionIndex) => (
              <RevealOnScroll key={section.id} delayMs={sectionIndex * 120}>
                <article id={section.id} className="scroll-mt-24">
                  <div className="relative">
                    <div
                      className="flex cursor-grab select-none snap-x gap-4 overflow-x-auto overscroll-x-contain pb-5 active:cursor-grabbing 2xl:gap-5 [touch-action:pan-y]"
                      onPointerDown={(event) => handleShelfPointerDown(section.id, event)}
                      onPointerMove={(event) => handleShelfPointerMove(section.id, event)}
                      onPointerUp={(event) => finishShelfDrag(section.id, event)}
                      onPointerCancel={(event) => finishShelfDrag(section.id, event)}
                      onClickCapture={(event) => preventClickAfterDrag(section.id, event)}
                      onDragStart={(event) => event.preventDefault()}
                    >
                      {section.cards.map((card, cardIndex) => renderCompactShelfCard(section, card, cardIndex, section.id))}
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 rounded-full bg-[linear-gradient(90deg,rgba(8,120,216,0.18),rgba(18,184,177,0.34),rgba(8,120,216,0.18))] shadow-sm" aria-hidden="true" />
                  </div>
                </article>
              </RevealOnScroll>
            ))}
          </div>
        ) : (
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
                    className="scroll-mt-24 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {showSectionNumbers ? (
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-lg font-bold text-white ${tone.accent}`}>
                            {section.number}
                          </span>
                        ) : null}
                        <div>
                          <h3 className="text-xl font-semibold tracking-normal text-slate-950">{section.title}</h3>
                          <div className="mt-1 h-1 w-20 rounded-full bg-[linear-gradient(90deg,#0878D8,#12B8B1)]" />
                        </div>
                      </div>

                      {totalPages > 1 ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-500">
                            {currentPage + 1}/{totalPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => goToSectionPage(section.id, totalPages, 'previous')}
                            disabled={!canGoPrevious}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`ย้อนกลับ ${section.title}`}
                          >
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => goToSectionPage(section.id, totalPages, 'next')}
                            disabled={!canGoNext}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`ถัดไป ${section.title}`}
                          >
                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-5 grid gap-4" style={cardGridStyle}>
                      {visibleCards.map((card, cardIndex) => {
                        const absoluteCardIndex = currentPage * cardsPerPage + cardIndex;

                        return renderPlanCard(section, card, absoluteCardIndex, 'grouped');
                      })}
                    </div>
                  </article>
                </RevealOnScroll>
              );
            })}
          </div>
        )}
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
