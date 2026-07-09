import { defaultSiteContent } from '../data/siteContent.defaults';
import type { SiteContentFaqItem, SiteContentPlanCard, SiteContentState } from '../types/siteContent.types';

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
      coverImageUrl: card.coverImageUrl ?? fallbackCard.coverImageUrl ?? '',
      coverImageLayout: card.coverImageLayout === 'landscape' ? 'landscape' : fallbackCard.coverImageLayout || 'portrait',
      status: card.status || fallbackCard.status,
    };
  });
}

function normalizeFaqItems(items: SiteContentFaqItem[] | undefined) {
  if (!Array.isArray(items) || items.length === 0) {
    return defaultSiteContent.faqItems;
  }

  return items.map((item, index) => {
    const fallbackItem = defaultSiteContent.faqItems[index] || defaultSiteContent.faqItems[0];

    return {
      ...fallbackItem,
      ...item,
      question: item.question || fallbackItem.question,
      answer: item.answer || fallbackItem.answer,
      status: item.status || fallbackItem.status,
    };
  });
}
export function normalizeSiteContent(content: Partial<SiteContentState> | null | undefined): SiteContentState {
  const imageOverlayOpacity =
    typeof content?.heroBanner?.imageOverlayOpacity === 'number'
      ? Math.min(100, Math.max(0, content.heroBanner.imageOverlayOpacity))
      : defaultSiteContent.heroBanner.imageOverlayOpacity;
  const loginBackgroundOverlayOpacity =
    typeof content?.loginPage?.backgroundOverlayOpacity === 'number'
      ? Math.min(90, Math.max(0, content.loginPage.backgroundOverlayOpacity))
      : defaultSiteContent.loginPage.backgroundOverlayOpacity;

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
    loginPage: {
      ...defaultSiteContent.loginPage,
      ...content?.loginPage,
      backgroundImageUrl: content?.loginPage?.backgroundImageUrl || defaultSiteContent.loginPage.backgroundImageUrl,
      backgroundImageEnabled: content?.loginPage?.backgroundImageEnabled ?? defaultSiteContent.loginPage.backgroundImageEnabled,
      backgroundOverlayOpacity: loginBackgroundOverlayOpacity,
      loginPanelGradientEnabled: content?.loginPage?.loginPanelGradientEnabled ?? defaultSiteContent.loginPage.loginPanelGradientEnabled,
      loginPanelGradientFrom: content?.loginPage?.loginPanelGradientFrom || defaultSiteContent.loginPage.loginPanelGradientFrom,
      loginPanelGradientTo: content?.loginPage?.loginPanelGradientTo || defaultSiteContent.loginPage.loginPanelGradientTo,
      status: content?.loginPage?.status || defaultSiteContent.loginPage.status,
    },
    newsItems: Array.isArray(content?.newsItems) && content.newsItems.length > 0 ? content.newsItems : defaultSiteContent.newsItems,
    faqItems: normalizeFaqItems(content?.faqItems),
    planLevelCards: normalizePlanCards(content?.planLevelCards, defaultSiteContent.planLevelCards),
    diseaseControlPlanCards: normalizePlanCards(content?.diseaseControlPlanCards, defaultSiteContent.diseaseControlPlanCards),
    annualGuidelineCards: normalizePlanCards(content?.annualGuidelineCards, defaultSiteContent.annualGuidelineCards),
    riskManagementPlanCards: normalizePlanCards(content?.riskManagementPlanCards, defaultSiteContent.riskManagementPlanCards),
    executivePolicyCards: normalizePlanCards(content?.executivePolicyCards, defaultSiteContent.executivePolicyCards),
    r2rResearchCards: normalizePlanCards(content?.r2rResearchCards, defaultSiteContent.r2rResearchCards),
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
