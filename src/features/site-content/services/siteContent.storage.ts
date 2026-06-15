import { defaultSiteContent } from '../data/siteContent.defaults';
import type { SiteContentState } from '../types/siteContent.types';

const SITE_CONTENT_STORAGE_KEY = 'ptdms.siteContent.v1';
export const SITE_CONTENT_UPDATED_EVENT = 'ptdms-site-content-updated';

function isBrowserStorageAvailable() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function normalizeSiteContent(content: Partial<SiteContentState> | null | undefined): SiteContentState {
  const imageOverlayOpacity =
    typeof content?.heroBanner?.imageOverlayOpacity === 'number'
      ? Math.min(100, Math.max(0, content.heroBanner.imageOverlayOpacity))
      : defaultSiteContent.heroBanner.imageOverlayOpacity;

  return {
    brandSettings: {
      ...defaultSiteContent.brandSettings,
      ...content?.brandSettings,
    },
    heroBanner: {
      ...defaultSiteContent.heroBanner,
      ...content?.heroBanner,
      imageOverlayOpacity,
    },
    newsItems: Array.isArray(content?.newsItems) && content.newsItems.length > 0 ? content.newsItems : defaultSiteContent.newsItems,
    planLevelCards:
      Array.isArray(content?.planLevelCards) && content.planLevelCards.length > 0
        ? content.planLevelCards
        : defaultSiteContent.planLevelCards,
    diseaseControlPlanCards:
      Array.isArray(content?.diseaseControlPlanCards) && content.diseaseControlPlanCards.length > 0
        ? content.diseaseControlPlanCards
        : defaultSiteContent.diseaseControlPlanCards,
    annualGuidelineCards:
      Array.isArray(content?.annualGuidelineCards) && content.annualGuidelineCards.length > 0
        ? content.annualGuidelineCards
        : defaultSiteContent.annualGuidelineCards,
    riskManagementPlanCards:
      Array.isArray(content?.riskManagementPlanCards) && content.riskManagementPlanCards.length > 0
        ? content.riskManagementPlanCards
        : defaultSiteContent.riskManagementPlanCards,
    executivePolicyCards:
      Array.isArray(content?.executivePolicyCards) && content.executivePolicyCards.length > 0
        ? content.executivePolicyCards
        : defaultSiteContent.executivePolicyCards,
  };
}

export function loadSiteContent(): SiteContentState {
  if (!isBrowserStorageAvailable()) {
    return defaultSiteContent;
  }

  const rawValue = window.localStorage.getItem(SITE_CONTENT_STORAGE_KEY);
  if (!rawValue) {
    return defaultSiteContent;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<SiteContentState>;
    return normalizeSiteContent(parsed);
  } catch {
    return defaultSiteContent;
  }
}

export function saveSiteContent(content: SiteContentState) {
  if (!isBrowserStorageAvailable()) {
    return;
  }

  window.localStorage.setItem(SITE_CONTENT_STORAGE_KEY, JSON.stringify(content));
  window.dispatchEvent(new CustomEvent(SITE_CONTENT_UPDATED_EVENT, { detail: content }));
}

export function resetSiteContent() {
  if (!isBrowserStorageAvailable()) {
    return defaultSiteContent;
  }

  window.localStorage.removeItem(SITE_CONTENT_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(SITE_CONTENT_UPDATED_EVENT, { detail: defaultSiteContent }));
  return defaultSiteContent;
}
