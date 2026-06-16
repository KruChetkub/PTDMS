import { defaultSiteContent } from '../data/siteContent.defaults';
import type { SiteContentPlanCard, SiteContentState } from '../types/siteContent.types';

const SITE_CONTENT_STORAGE_KEY = 'ptdms.siteContent.v1';
export const SITE_CONTENT_UPDATED_EVENT = 'ptdms-site-content-updated';

function isBrowserStorageAvailable() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizePlanCards(cards: SiteContentPlanCard[] | undefined, fallbackCards: SiteContentPlanCard[]) {
  if (!Array.isArray(cards)) {
    return fallbackCards;
  }

  return cards.map((card, index) => {
    const fallbackCard = fallbackCards[index] || fallbackCards[0];

    return {
      ...fallbackCard,
      ...card,
      title: card.title || fallbackCard.title,
      subtitle: card.subtitle ?? fallbackCard.subtitle,
      iconKey: card.iconKey || fallbackCard.iconKey,
      color: card.color || fallbackCard.color,
      actionLabel: card.actionLabel || fallbackCard.actionLabel,
      pdfUrl: card.pdfUrl ?? '',
      status: card.status || fallbackCard.status,
    };
  });
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
    planLevelCards: normalizePlanCards(content?.planLevelCards, defaultSiteContent.planLevelCards),
    diseaseControlPlanCards: normalizePlanCards(content?.diseaseControlPlanCards, defaultSiteContent.diseaseControlPlanCards),
    annualGuidelineCards: normalizePlanCards(content?.annualGuidelineCards, defaultSiteContent.annualGuidelineCards),
    riskManagementPlanCards: normalizePlanCards(content?.riskManagementPlanCards, defaultSiteContent.riskManagementPlanCards),
    executivePolicyCards: normalizePlanCards(content?.executivePolicyCards, defaultSiteContent.executivePolicyCards),
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
