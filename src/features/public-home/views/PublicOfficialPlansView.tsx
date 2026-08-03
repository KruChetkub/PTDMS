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

  return (
    <>
      <section className="bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">
            ยุทธศาสตร์/แผนปฏิบัติราชการ กรมควบคุมโรค
          </h1>
        </div>
      </section>

      {sections.length > 0 ? (
        <HomePlanSections sections={sections} logoUrl={logoUrl} displayMode="shelf" />
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