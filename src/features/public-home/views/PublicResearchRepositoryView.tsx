import { useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { HomePlanSections } from '../components/HomePlanSections';
import {
  getResearchCategory,
  loadPublicResearchItems,
  researchCategoryOptions,
  type PublicResearchItem,
} from '../services/publicResearchItems.service';
import type { HomePlanSection } from '../types/publicHome.types';

type Props = { logoUrl: string };

export function PublicResearchRepositoryView({ logoUrl }: Props) {
  const [researchItems, setResearchItems] = useState<PublicResearchItem[]>([]);
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadPublicResearchItems()
      .then((items) => { if (mounted) setResearchItems(items); })
      .catch(() => { if (mounted) setHasLoadError(true); });
    return () => { mounted = false; };
  }, []);

  const publishedItems = useMemo(() => researchItems.filter((item) => item.status === 'published'), [researchItems]);
  const sections = useMemo<HomePlanSection[]>(() => {
    return researchCategoryOptions.map((category, index) => ({
      id: `research-${category.value}`,
      number: String(index + 1),
      title: category.label,
      tone: category.tone,
      cards: publishedItems.filter((item) => item.category === category.value).map((item) => ({
        title: item.title,
        subtitle: item.researcherNames,
        description: [item.organization, item.abstract].filter(Boolean).join(' — '),
        icon: FileText,
        color: getResearchCategory(item.category).color,
        actionLabel: item.actionLabel,
        pdfUrl: item.pdfUrl,
        coverImageUrl: item.coverImageUrl,
        coverImageLayout: item.coverImageLayout,
      })),
    })).filter((section) => section.cards.length > 0);
  }, [publishedItems]);

  const publishedCount = publishedItems.length;
  const yearCount = new Set(publishedItems.map((item) => item.publicationYear)).size;

  return (
    <>
      <section className="relative isolate overflow-hidden bg-[#073B74] px-3 py-1.5 text-white sm:px-4 sm:py-2 lg:px-5">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#064E5A_0%,#07888B_48%,#11A37F_100%)]" aria-hidden="true" />
        <div className="relative grid gap-2 lg:grid-cols-[minmax(0,1fr)_32rem] lg:items-center">
          <div>
            <h1 className="text-sm font-bold leading-tight tracking-normal text-white sm:text-lg lg:text-xl">งานวิจัยจากงานประจำ</h1>
            <p className="mt-1 text-xs font-medium text-white/80">การวิจัยเพื่อพัฒนาคุณภาพงาน</p>
          </div>
          <div className="grid grid-cols-2 gap-1.5 rounded-md border border-white/25 bg-white/15 p-1.5 shadow-2xl backdrop-blur-md">
            <div className="rounded-md bg-white/95 px-2.5 py-1 text-slate-900"><div className="text-base font-bold text-[#075DA8]">{publishedCount}</div><div className="text-[10px] font-semibold text-slate-600">งานวิจัยเผยแพร่</div></div>
            <div className="rounded-md bg-white/95 px-2.5 py-1 text-slate-900"><div className="text-base font-bold text-[#008B8B]">{yearCount}</div><div className="text-[10px] font-semibold text-slate-600">ปีที่เผยแพร่</div></div>
          </div>
        </div>
      </section>

      {sections.length ? (
        <HomePlanSections sections={sections} logoUrl={logoUrl} displayMode="shelf" showPlanBanner={false} />
      ) : (
        <section className="min-h-[360px] bg-white py-12 sm:py-16"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-sm leading-6 text-slate-500">{hasLoadError ? 'ไม่สามารถโหลดข้อมูลงานวิจัยจาก Supabase ได้ กรุณาตรวจสอบ migration และการเชื่อมต่อ' : 'ยังไม่มีงานวิจัยที่เผยแพร่'}</div></div></section>
      )}
    </>
  );
}
