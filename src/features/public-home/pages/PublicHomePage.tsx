import { Activity, FileText, HeartPulse, Landmark, Puzzle, ShieldCheck, Target, TrendingUp, UsersRound } from 'lucide-react';
import { HomeFaqSection } from '../components/HomeFaqSection';
import { HomeFooter } from '../components/HomeFooter';
import { HomeHeroBanner } from '../components/HomeHeroBanner';
import { HomeNewsSection } from '../components/HomeNewsSection';
import { HomePlanSections } from '../components/HomePlanSections';
import { HomeQuickNav } from '../components/HomeQuickNav';
import { PublicHomeHeader } from '../components/PublicHomeHeader';
import { usePublishedSiteContent } from '../../site-content/hooks/useSiteContent';
import {
  homeFaqItems,
  homeHeroBanner,
  homePlanSections,
  homeQuickNavItems,
} from '../data/publicHome.mock';
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
  const planSections = homePlanSections.map((section) =>
    section.id === 'plan-levels'
      ? {
          ...section,
          cards: siteContent.planLevelCards
            .filter((card) => card.status === 'published')
            .map((card) => ({
              title: card.title,
              subtitle: card.subtitle,
              description: card.description,
              icon: planIconMap[card.iconKey] || UsersRound,
              color: card.color,
              actionLabel: card.actionLabel,
              pdfUrl: card.pdfUrl,
            })),
        }
      : section.id === 'disease-control-plan'
        ? {
            ...section,
            cards: siteContent.diseaseControlPlanCards
              .filter((card) => card.status === 'published')
              .map((card) => ({
                title: card.title,
                subtitle: card.subtitle,
                description: card.description,
                icon: planIconMap[card.iconKey] || UsersRound,
                color: card.color,
                actionLabel: card.actionLabel,
                pdfUrl: card.pdfUrl,
              })),
          }
        : section.id === 'annual-guidelines'
          ? {
              ...section,
              cards: siteContent.annualGuidelineCards
                .filter((card) => card.status === 'published')
                .map((card) => ({
                  title: card.title,
                  subtitle: card.subtitle,
                  description: card.description,
                  icon: planIconMap[card.iconKey] || UsersRound,
                  color: card.color,
                  actionLabel: card.actionLabel,
                  pdfUrl: card.pdfUrl,
                })),
            }
          : section.id === 'risk-management'
            ? {
                ...section,
                cards: siteContent.riskManagementPlanCards
                  .filter((card) => card.status === 'published')
                  .map((card) => ({
                    title: card.title,
                    subtitle: card.subtitle,
                    description: card.description,
                    icon: planIconMap[card.iconKey] || UsersRound,
                    color: card.color,
                    actionLabel: card.actionLabel,
                    pdfUrl: card.pdfUrl,
                  })),
              }
            : section.id === 'executive-policy'
              ? {
                  ...section,
                  cards: siteContent.executivePolicyCards
                    .filter((card) => card.status === 'published')
                    .map((card) => ({
                      title: card.title,
                      subtitle: card.subtitle,
                      description: card.description,
                      icon: planIconMap[card.iconKey] || UsersRound,
                      color: card.color,
                      actionLabel: card.actionLabel,
                      pdfUrl: card.pdfUrl,
                    })),
                }
      : section,
  );

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <PublicHomeHeader logoUrl={siteContent.brandSettings.logoUrl} siteName={siteContent.brandSettings.siteName} />
      <main>
        <HomeHeroBanner banner={heroBanner} />
        <HomeQuickNav items={homeQuickNavItems} />
        <HomePlanSections sections={planSections} logoUrl={siteContent.brandSettings.logoUrl} />
        <HomeNewsSection news={visibleNews} />
        <HomeFaqSection faqs={homeFaqItems} />
      </main>
      <HomeFooter />
    </div>
  );
}
