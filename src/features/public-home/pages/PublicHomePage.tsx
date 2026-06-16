import { Activity, FileText, HeartPulse, Landmark, Puzzle, ShieldCheck, Target, TrendingUp, UsersRound } from 'lucide-react';
import { HomeFaqSection } from '../components/HomeFaqSection';
import { HomeFooter } from '../components/HomeFooter';
import { HomeHeroBanner } from '../components/HomeHeroBanner';
import { HomeMobileSectionLauncher } from '../components/HomeMobileSectionLauncher';
import { HomePlanLevelsBanner } from '../components/HomePlanLevelsBanner';
import { HomeNewsSection } from '../components/HomeNewsSection';
import { HomePlanSections } from '../components/HomePlanSections';
import { PublicHomeHeader } from '../components/PublicHomeHeader';
import { usePublishedSiteContent } from '../../site-content/hooks/useSiteContent';
import {
  homeFaqItems,
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
};

function mapVisiblePlanCards(cards: SiteContentPlanCard[]) {
  return cards
    .filter((card) => card.status !== 'scheduled')
    .map((card) => ({
      title: card.title,
      subtitle: card.subtitle,
      description: card.description,
      icon: planIconMap[card.iconKey] || UsersRound,
      color: card.color,
      actionLabel: card.actionLabel,
      pdfUrl: card.pdfUrl,
    }));
}

export function PublicHomePage() {
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
  const planSections = homePlanSections.map((section) => {
    const selectCards = planSectionCardSelectors[section.id];
    if (!selectCards) return section;

    return {
      ...section,
      cards: mapVisiblePlanCards(selectCards(siteContent)),
    };
  });

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <PublicHomeHeader logoUrl={siteContent.brandSettings.logoUrl} siteName={siteContent.brandSettings.siteName} />
      <main>
        <HomeHeroBanner banner={heroBanner} />
        <div className="bg-slate-50 px-4 pt-6 lg:hidden">
          <HomePlanLevelsBanner logoUrl={siteContent.brandSettings.logoUrl} />
        </div>
        <HomeMobileSectionLauncher planSections={planSections} news={visibleNews} faqs={homeFaqItems} />
        <div className="hidden lg:block">
          <HomePlanSections sections={planSections} logoUrl={siteContent.brandSettings.logoUrl} />
          <HomeNewsSection news={visibleNews} />
          <HomeFaqSection faqs={homeFaqItems} />
        </div>
      </main>
      <HomeFooter />
    </div>
  );
}
