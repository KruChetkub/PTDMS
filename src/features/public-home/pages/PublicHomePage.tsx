import { Activity, FileText, HeartPulse, Landmark, Puzzle, ShieldCheck, Target, TrendingUp, UsersRound } from 'lucide-react';
import { CookieConsentBanner } from '../components/CookieConsentBanner';
import { HomeFaqSection } from '../components/HomeFaqSection';
import { HomeFooter } from '../components/HomeFooter';
import { HomeHeroBanner } from '../components/HomeHeroBanner';
import { HomeMobileSectionLauncher } from '../components/HomeMobileSectionLauncher';
import { HomePlanLevelsBanner } from '../components/HomePlanLevelsBanner';
import { HomeNewsSection } from '../components/HomeNewsSection';
import { HomePlanSections } from '../components/HomePlanSections';
import { PublicHomeHeader } from '../components/PublicHomeHeader';
import { usePublishedSiteContent } from '../../site-content/hooks/useSiteContent';
import { usePublicPageAnalytics } from '../hooks/usePublicPageAnalytics';
import {
  homeHeroBanner,
  homePlanSections,
} from '../data/publicHome.mock';
import type {
  SiteContentPlanCard,
  SiteContentPlanIconKey,
  SiteContentState,
} from '../../site-content/types/siteContent.types';

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

const planSectionCardSelectors: Record<string, (content: SiteContentState) => SiteContentPlanCard[]> = {
  'plan-levels': (content) => content.planLevelCards,
  'disease-control-plan': (content) => content.diseaseControlPlanCards,
  'annual-guidelines': (content) => content.annualGuidelineCards,
  'risk-management': (content) => content.riskManagementPlanCards,
  'executive-policy': (content) => content.executivePolicyCards,
  'r2r-research': (content) => content.r2rResearchCards,
};

function mapVisiblePlanCards(cards: SiteContentPlanCard[]) {
  return cards
    .filter((card) => card.status === 'published')
    .map((card) => ({
      title: card.title,
      subtitle: card.subtitle,
      description: card.description,
      icon: planIconMap[card.iconKey] || UsersRound,
      color: card.color,
      actionLabel: card.actionLabel,
      pdfUrl: card.pdfUrl,
      coverImageUrl: card.coverImageUrl,
      coverImageLayout: card.coverImageLayout,
    }));
}

export function PublicHomePage() {
  usePublicPageAnalytics();
  const siteContent = usePublishedSiteContent();
  const heroBanner = {
    ...homeHeroBanner,
    eyebrow: siteContent.heroBanner.eyebrow,
    title: siteContent.heroBanner.title,
    description: siteContent.heroBanner.description,
    imageUrl: siteContent.heroBanner.imageUrl,
    imageOverlayOpacity: siteContent.heroBanner.imageOverlayOpacity,
    actions: [
      {
        label: siteContent.heroBanner.primaryActionLabel,
        href: siteContent.heroBanner.primaryActionHref,
        variant: 'primary' as const,
      },
      {
        label: siteContent.heroBanner.secondaryActionLabel,
        href: siteContent.heroBanner.secondaryActionHref,
        variant: 'secondary' as const,
      },
    ],
  };
  const visibleNews = siteContent.newsItems.filter((item) => item.status === 'published');
  const visibleFaqs = siteContent.faqItems
    .filter((item) => item.status === 'published')
    .map((item) => ({ question: item.question, answer: item.answer }));
  const allPlanSections = homePlanSections.map((section) => {
    const selectCards = planSectionCardSelectors[section.id];
    if (!selectCards) return section;

    return {
      ...section,
      cards: mapVisiblePlanCards(selectCards(siteContent)),
    };
  });
  const r2rSections = allPlanSections.filter((section) => section.id === 'r2r-research');
  const planSections = allPlanSections.filter((section) => section.id !== 'r2r-research');

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <PublicHomeHeader logoUrl={siteContent.brandSettings.logoUrl} siteName={siteContent.brandSettings.siteName} />
      <main>
        <HomeHeroBanner banner={heroBanner} />
        <div className="bg-slate-50 px-4 pt-6 lg:hidden">
          <HomePlanLevelsBanner logoUrl={siteContent.brandSettings.logoUrl} />
        </div>
        <HomeMobileSectionLauncher planSections={planSections} news={visibleNews} faqs={visibleFaqs} />
        <div className="hidden lg:block">
          <HomePlanSections sections={planSections} logoUrl={siteContent.brandSettings.logoUrl} />
        </div>
        <HomePlanSections
          sections={r2rSections}
          logoUrl={siteContent.brandSettings.logoUrl}
          sectionId="r2r-research"
          showPlanBanner={false}
          showSectionNumbers={false}
          heading="งานวิจัยจากงานประจำกองยุทธศาสตร์และแผนงาน (R2R)"
          description="รวบรวมผลงานวิจัยจากงานประจำ แยกจากหมวดแผนเพื่อให้เข้าถึงได้ชัดเจน"
        />
        <div className="hidden lg:block">
          <HomeNewsSection news={visibleNews} />
          <HomeFaqSection faqs={visibleFaqs} />
        </div>
      </main>
      <HomeFooter />
      <CookieConsentBanner />
    </div>
  );
}
