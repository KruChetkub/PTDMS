import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CookieConsentBanner } from '../components/CookieConsentBanner';
import { HomeFooter } from '../components/HomeFooter';
import { PublicHomeSidebar } from '../components/PublicHomeSidebar';
import { PublicPerformanceResultsManager } from '../components/PublicPerformanceResultsManager';
import { PublicResearchItemsManager } from '../components/PublicResearchItemsManager';
import { PublicUserPlansSection } from '../components/PublicUserPlansSection';
import { PublicHomeContentManager } from '../components/PublicHomeContentManager';
import { PublicOfficialPlansView } from '../views/PublicOfficialPlansView';
import { PublicPerformanceResultsRepositoryView } from '../views/PublicPerformanceResultsRepositoryView';
import { PublicResearchRepositoryView } from '../views/PublicResearchRepositoryView';
import { usePublishedSiteContent } from '../../site-content/hooks/useSiteContent';
import { usePublicPageAnalytics } from '../hooks/usePublicPageAnalytics';
import { useAuthStore } from '../../../stores/auth.store';
import type { PublicHomeView } from '../types/publicHomeView.types';

export function PublicHomePage() {
  const [searchParams] = useSearchParams();
  const requestedView = searchParams.get('view');
  const initialView: PublicHomeView = requestedView === 'performance' || requestedView === 'research' ? requestedView : 'plans';
  const [activeView, setActiveView] = useState<PublicHomeView>(initialView);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const profile = useAuthStore((state) => state.profile);
  const canManagePublicContent = profile?.role === 'admin' || profile?.role === 'super_admin';

  useEffect(() => {
    document.title = 'คลังเอกสารยุทธศาสตร์ SmartDSP';

    return () => {
      document.title = 'SmartDSP';
    };
  }, []);

  useEffect(() => {
    if (requestedView === 'plans' || requestedView === 'performance' || requestedView === 'research') {
      setActiveView(requestedView);
    }
  }, [requestedView]);

  useEffect(() => {
    if (!canManagePublicContent && (activeView === 'my-plans' || activeView === 'my-performance' || activeView === 'my-research' || activeView === 'home-settings')) {
      setActiveView('plans');
    }
  }, [activeView, canManagePublicContent]);

  usePublicPageAnalytics();
  const siteContent = usePublishedSiteContent();
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
            {activeView === 'my-plans' && canManagePublicContent ? <PublicUserPlansSection /> : null}
            {activeView === 'performance' ? <PublicPerformanceResultsRepositoryView logoUrl={siteContent.brandSettings.logoUrl} /> : null}
            {activeView === 'my-performance' && canManagePublicContent ? <PublicPerformanceResultsManager /> : null}
            {activeView === 'research' ? <PublicResearchRepositoryView logoUrl={siteContent.brandSettings.logoUrl} /> : null}
            {activeView === 'my-research' && canManagePublicContent ? <PublicResearchItemsManager /> : null}
            {activeView === 'home-settings' && canManagePublicContent ? <PublicHomeContentManager /> : null}
          </div>
        </div>
      </main>
      <HomeFooter />
      <CookieConsentBanner />
    </div>
  );
}
