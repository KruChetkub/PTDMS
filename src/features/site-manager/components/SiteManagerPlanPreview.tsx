import { Activity, ArrowRight, FileText, HeartPulse, Landmark, Puzzle, ShieldCheck, Target, TrendingUp } from 'lucide-react';
import type { SiteContentPlanCard, SiteContentPlanIconKey } from '../../site-content/types/siteContent.types';

type SiteManagerPlanPreviewProps = {
  title: string;
  cards: SiteContentPlanCard[];
  onCardSelect?: (cardIndex: number) => void;
};

const planIconMap = {
  landmark: Landmark,
  goal: Target,
  puzzle: Puzzle,
  growth: TrendingUp,
  heart: HeartPulse,
  health: Activity,
  'shield-users': ShieldCheck,
  file: FileText,
} satisfies Record<SiteContentPlanIconKey, typeof Landmark>;

function getPreviewGridClass(cardCount: number) {
  if (cardCount <= 1) return 'lg:grid-cols-1';
  if (cardCount === 2) return 'lg:grid-cols-2';
  if (cardCount === 3) return 'lg:grid-cols-3';
  if (cardCount === 4) return 'lg:grid-cols-4';
  return 'lg:grid-cols-5';
}

export function SiteManagerPlanPreview({ title, cards, onCardSelect }: SiteManagerPlanPreviewProps) {
  const visibleCards = cards
    .map((card, cardIndex) => ({ card, cardIndex }))
    .filter(({ card }) => card.status === 'published');

  return (
    <section className="rounded-md border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold tracking-normal text-emerald-950">ตัวอย่าง{title}</h2>
          <p className="mt-1 text-sm text-emerald-700">คลิกการ์ดเพื่อเลื่อนไปแก้ไขรายการนั้น</p>
        </div>
        <span className="w-fit rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
          {visibleCards.length} รายการเผยแพร่
        </span>
      </div>

      <div className={`mt-5 grid gap-4 sm:grid-cols-2 ${getPreviewGridClass(visibleCards.length)}`}>
        {visibleCards.length > 0 ? (
          visibleCards.map(({ card, cardIndex }) => {
            const Icon = planIconMap[card.iconKey] || FileText;

            return (
              <button
                key={`${card.title}-${card.subtitle}-${cardIndex}`}
                type="button"
                onClick={() => onCardSelect?.(cardIndex)}
                className="flex min-h-64 flex-col rounded-md border border-emerald-200 bg-white p-4 text-center text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                {card.coverImageUrl ? (
                  <div className="mx-auto aspect-[9/16] w-full max-w-[112px] overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                    <img src={card.coverImageUrl} alt={`ภาพหน้าปก ${card.title}`} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${card.color} text-white`}>
                    <Icon className="h-7 w-7" aria-hidden="true" />
                  </div>
                )}
                <h3 className="mt-4 text-sm font-semibold leading-6 tracking-normal">{card.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{card.subtitle}</p>
                {card.description ? <p className="mt-1 text-xs text-slate-500">{card.description}</p> : null}
                <span className="mt-auto inline-flex items-center justify-center gap-2 rounded-md border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-700">
                  {card.actionLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </button>
            );
          })
        ) : (
          <div className="rounded-md border border-dashed border-emerald-300 bg-white px-4 py-6 text-sm text-emerald-700 sm:col-span-2 lg:col-span-5">
            ยังไม่มีรายการที่เผยแพร่ในแผนระดับต่าง ๆ
          </div>
        )}
      </div>
    </section>
  );
}