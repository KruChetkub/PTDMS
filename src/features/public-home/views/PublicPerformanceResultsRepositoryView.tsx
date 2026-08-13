import { useEffect, useMemo, useState } from 'react';
import { FileText, Gauge, Target, TrendingUp } from 'lucide-react';
import { HomePlanSections } from '../components/HomePlanSections';
import {
  loadPublicPerformanceResults,
  type PublicPerformanceResult,
} from '../services/publicPerformanceResults.service';
import { getDefaultRepositoryCategories, loadPublicRepositoryCategories, type PublicRepositoryCategory } from '../services/publicRepositoryCategories.service';
import type { HomePlanSection } from '../types/publicHome.types';

const iconMap = {
  'key-result': TrendingUp,
  'annual-report': FileText,
  'achievement-report': FileText,
  'risk-management-report': FileText,
  'indicator-report': Gauge,
  other: Target,
};

type Props = { logoUrl: string };

export function PublicPerformanceResultsRepositoryView({ logoUrl }: Props) {
  const [results, setResults] = useState<PublicPerformanceResult[]>([]);
  const [categories, setCategories] = useState<PublicRepositoryCategory[]>(() => getDefaultRepositoryCategories('performance'));
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadPublicPerformanceResults()
      .then((items) => { if (mounted) setResults(items); })
      .catch(() => { if (mounted) setHasLoadError(true); });
    loadPublicRepositoryCategories('performance')
      .then((loadedCategories) => { if (mounted) setCategories(loadedCategories.filter((category) => category.isActive)); })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  const publishedResults = useMemo(() => results.filter((result) => result.status === 'published'), [results]);
  const sections = useMemo<HomePlanSection[]>(() => categories.map((category, index) => ({
    id: `performance-${category.key}`,
    number: String(index + 1),
    title: category.label,
    tone: category.tone,
    cards: publishedResults.filter((result) => result.category === category.key).map((result) => ({
      title: result.title,
      subtitle: result.subtitle || `ปีงบประมาณ พ.ศ. ${result.fiscalYear}`,
      description: result.description,
      icon: iconMap[result.category as keyof typeof iconMap] || FileText,
      color: category.color,
      actionLabel: result.actionLabel,
      pdfUrl: result.pdfUrl,
      coverImageUrl: result.coverImageUrl,
      coverImageLayout: result.coverImageLayout,
    })),
  })).filter((section) => section.cards.length > 0), [categories, publishedResults]);

  const fiscalYearCount = new Set(publishedResults.map((result) => result.fiscalYear)).size;

  return (
    <>
      <section className="relative isolate overflow-hidden bg-[#073B74] px-3 py-1.5 text-white sm:px-4 sm:py-2 lg:px-5">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#073B74_0%,#0878D8_46%,#11A37F_100%)]" aria-hidden="true" />
        <div className="relative grid gap-2 lg:grid-cols-[minmax(0,1fr)_32rem] lg:items-center">
          <div>
            <h1 className="text-sm font-bold leading-tight tracking-normal text-white sm:text-lg lg:text-xl">ผลการดำเนินงานสำคัญ</h1>
            <h1 className="text-sm font-bold leading-tight tracking-normal text-white sm:text-lg lg:text-xl">กรมควบคุมโรค</h1>
          </div>
          <div className="grid grid-cols-2 gap-1.5 rounded-md border border-white/25 bg-white/15 p-1.5 shadow-2xl backdrop-blur-md">
            <div className="rounded-md bg-white/95 px-2.5 py-1 text-slate-900"><div className="text-base font-bold text-[#075DA8]">{publishedResults.length}</div><div className="text-[10px] font-semibold text-slate-600">รายการเผยแพร่</div></div>
            <div className="rounded-md bg-white/95 px-2.5 py-1 text-slate-900"><div className="text-base font-bold text-[#008B8B]">{fiscalYearCount}</div><div className="text-[10px] font-semibold text-slate-600">ปีงบประมาณ</div></div>
          </div>
        </div>
      </section>

      {sections.length ? (
        <HomePlanSections sections={sections} logoUrl={logoUrl} displayMode="shelf" showPlanBanner={false} />
      ) : (
        <section className="min-h-[360px] bg-white py-12 sm:py-16"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-sm leading-6 text-slate-500">{hasLoadError ? 'ไม่สามารถโหลดข้อมูลจาก Supabase ได้ กรุณาตรวจสอบการเชื่อมต่อระบบ' : 'ยังไม่มีผลการดำเนินงานที่เผยแพร่'}</div></div></section>
      )}
    </>
  );
}
