import { useEffect, useMemo, useState } from 'react';
import { Activity, FileText, HeartPulse, Landmark, Puzzle, ShieldCheck, Target, TrendingUp, UsersRound } from 'lucide-react';
import { HomePlanSections } from '../components/HomePlanSections';
import { comparePublicUserPlans, loadPublicUserPlans, PUBLIC_USER_PLANS_UPDATED_EVENT, type PublicUserPlan, type PublicUserPlanCategory } from '../services/publicUserPlans.service';
import type { HomePlanSection } from '../types/publicHome.types';
import type { SiteContentPlanIconKey } from '../../site-content/types/siteContent.types';

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

const categorySections: Array<Pick<HomePlanSection, 'id' | 'number' | 'title' | 'tone'> & { category: PublicUserPlanCategory }> = [
  { id: 'plan-level-1', category: 'plan-level-1', number: '1', title: 'แผนระดับ 1', tone: 'blue' },
  { id: 'plan-level-2', category: 'plan-level-2', number: '2', title: 'แผนระดับ 2', tone: 'emerald' },
  { id: 'plan-level-3', category: 'plan-level-3', number: '3', title: 'แผนระดับ 3', tone: 'violet' },
  { id: 'executive-policy', category: 'executive-policy', number: '4', title: 'นโยบายผู้บริหาร', tone: 'orange' },
  { id: 'other', category: 'other', number: '5', title: 'อื่นๆ', tone: 'rose' },
];

const heroSectionClassName = 'relative isolate overflow-hidden bg-[#073B74] px-3 py-1.5 text-white sm:px-4 sm:py-2 lg:px-5';

type PublicOfficialPlansViewProps = {
  logoUrl: string;
};

function mapPlanToCard(plan: PublicUserPlan) {
  return {
    title: plan.card.title,
    subtitle: plan.card.subtitle,
    description: plan.card.description,
    icon: planIconMap[plan.card.iconKey] || UsersRound,
    color: plan.card.color,
    actionLabel: plan.card.actionLabel,
    pdfUrl: plan.card.pdfUrl,
    coverImageUrl: plan.card.coverImageUrl,
    coverImageLayout: plan.card.coverImageLayout,
  };
}

export function PublicOfficialPlansView({ logoUrl }: PublicOfficialPlansViewProps) {
  const [plans, setPlans] = useState<PublicUserPlan[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadPlans = async () => {
      const document = await loadPublicUserPlans();
      if (isMounted) {
        setPlans(document.plans);
      }
    };

    const handlePlansUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ plans: PublicUserPlan[] }>;
      setPlans(customEvent.detail?.plans || []);
    };

    window.addEventListener(PUBLIC_USER_PLANS_UPDATED_EVENT, handlePlansUpdated);
    void loadPlans();

    return () => {
      isMounted = false;
      window.removeEventListener(PUBLIC_USER_PLANS_UPDATED_EVENT, handlePlansUpdated);
    };
  }, []);

  const publishedPlans = useMemo(() => plans.filter((plan) => plan.card.status === 'published').sort(comparePublicUserPlans), [plans]);
  const sections = useMemo(
    () =>
      categorySections
        .map((section) => ({
          id: section.id,
          number: section.number,
          title: section.title,
          tone: section.tone,
          cards: publishedPlans.filter((plan) => plan.category === section.category).sort(comparePublicUserPlans).map(mapPlanToCard),
        }))
        .filter((section) => section.cards.length > 0),
    [publishedPlans],
  );
  const visibleCategoryCount = sections.length;

  return (
    <>
      <section className={heroSectionClassName}>
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#053B80_0%,#0878D8_45%,#12B8B1_100%)]" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-8 bg-[radial-gradient(110%_90%_at_10%_100%,rgba(13,220,196,0.46)_0%,rgba(13,220,196,0)_55%),radial-gradient(120%_90%_at_90%_0%,rgba(255,255,255,0.24)_0%,rgba(255,255,255,0)_58%)]" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-7 overflow-hidden" aria-hidden="true">
          <div className="absolute -bottom-9 left-[-6%] h-12 w-[112%] rounded-[50%] border-t-2 border-white/70" />
          <div className="absolute -bottom-2 left-[-8%] h-10 w-[116%] rounded-[50%] border-t-2 border-cyan-200/80" />
          <div className="absolute bottom-[-3rem] left-[-5%] h-12 w-[110%] rounded-[50%] bg-white/10" />
        </div>

        <div className="relative grid gap-2 lg:grid-cols-[minmax(0,1fr)_32rem] lg:items-center">
          <div>

            <h1 className="max-w-2xl text-sm font-bold leading-tight tracking-normal text-white sm:text-lg lg:text-xl">
              ยุทธศาสตร์/แผนปฏิบัติราชการ
            </h1>
            <h1 className="max-w-2xl text-sm font-bold leading-tight tracking-normal text-white sm:text-lg lg:text-xl">
             กองยุทธศาสตร์และแผนงาน
            </h1>
            <h1 className="max-w-2xl text-sm font-bold leading-tight tracking-normal text-white sm:text-lg lg:text-xl">
            กรมควบคุมโรค
            </h1>

          </div>

          <div className="grid grid-cols-2 gap-1.5 rounded-md border border-white/25 bg-white/15 p-1.5 shadow-2xl backdrop-blur-md">
            <div className="rounded-md bg-white/95 px-2.5 py-1 text-slate-900">
              <div className="text-base font-bold text-[#075DA8]">{publishedPlans.length}</div>
              <div className="text-[10px] font-semibold text-slate-600">เอกสารเผยแพร่</div>
            </div>
            <div className="rounded-md bg-white/95 px-2.5 py-1 text-slate-900">
              <div className="text-base font-bold text-[#008B8B]">{visibleCategoryCount}</div>
              <div className="text-[10px] font-semibold text-slate-600">หมวดแผน</div>
            </div>
          </div>
        </div>
      </section>

      {sections.length > 0 ? (
        <HomePlanSections sections={sections} logoUrl={logoUrl} displayMode="shelf" showPlanBanner={false} />
      ) : (
        <section className="min-h-[360px] bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-sm leading-6 text-slate-500">
              ยังไม่มีแผนที่เผยแพร่จากหน้า “เพิ่มแผนของฉัน”
            </div>
          </div>
        </section>
      )}
    </>
  );
}
