import { useEffect, useState } from 'react';
import { Activity, FileText, HeartPulse, Landmark, Puzzle, ShieldCheck, Target, TrendingUp, UsersRound } from 'lucide-react';
import { CookieConsentBanner } from '../components/CookieConsentBanner';
import { HomeFooter } from '../components/HomeFooter';
import { PublicHomeSidebar } from '../components/PublicHomeSidebar';
import { PublicPerformanceResultsManager } from '../components/PublicPerformanceResultsManager';
import { PublicResearchItemsManager } from '../components/PublicResearchItemsManager';
import { PublicUserPlansSection } from '../components/PublicUserPlansSection';
import { PublicOfficialPlansView } from '../views/PublicOfficialPlansView';
import { PublicPerformanceResultsRepositoryView } from '../views/PublicPerformanceResultsRepositoryView';
import { PublicResearchRepositoryView } from '../views/PublicResearchRepositoryView';
import { usePublishedSiteContent } from '../../site-content/hooks/useSiteContent';
import { usePublicPageAnalytics } from '../hooks/usePublicPageAnalytics';
import { useAuthStore } from '../../../stores/auth.store';
import { homePlanSections } from '../data/publicHome.mock';
import type { PublicHomeView } from '../types/publicHomeView.types';
import type {
  SiteContentPlanCard,
  SiteContentPlanIconKey,
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
  const [activeView, setActiveView] = useState<PublicHomeView>('plans');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    document.title = 'Strategic Information Repository';

    return () => {
      document.title = 'SmartDSP';
    };
  }, []);

  useEffect(() => {
    if (!user && (activeView === 'my-plans' || activeView === 'my-performance' || activeView === 'my-research')) {
      setActiveView('plans');
    }
  }, [activeView, user]);

  usePublicPageAnalytics();
  const siteContent = usePublishedSiteContent();
  const r2rSections = homePlanSections
    .filter((section) => section.id === 'r2r-research')
    .map((section) => ({
      ...section,
      cards: mapVisiblePlanCards(siteContent.r2rResearchCards),
    }));

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <main>
        <div className="lg:flex">
          <PublicHomeSidebar
            activeView={activeView}
            isCollapsed={isSidebarCollapsed}
            logoUrl={siteContent.brandSettings.logoUrl}
            siteName={siteContent.brandSettings.siteName}
            onToggleCollapsed={() => setIsSidebarCollapsed((currentValue) => !currentValue)}
            onViewChange={setActiveView}
          />
          <div className="min-w-0 flex-1 bg-slate-50">
            {activeView === 'plans' ? <PublicOfficialPlansView logoUrl={siteContent.brandSettings.logoUrl} /> : null}
            {activeView === 'my-plans' ? <PublicUserPlansSection /> : null}
            {activeView === 'performance' ? <PublicPerformanceResultsRepositoryView logoUrl={siteContent.brandSettings.logoUrl} /> : null}
            {activeView === 'my-performance' ? <PublicPerformanceResultsManager /> : null}
            {activeView === 'research' ? <PublicResearchRepositoryView legacySections={r2rSections} logoUrl={siteContent.brandSettings.logoUrl} /> : null}
            {activeView === 'my-research' ? <PublicResearchItemsManager /> : null}
          </div>
        </div>
      </main>
      <HomeFooter />
      <CookieConsentBanner />
    </div>
  );
}