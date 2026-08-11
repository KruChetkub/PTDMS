import { supabase } from '../lib/supabase';

import { createUuid } from '../utils/uuid';

export const cookieConsentStorageKey = 'smartdsp_cookie_consent_v1';
export const publicVisitSessionStorageKey = 'smartdsp_public_visit_session_id';
const visitDedupePrefix = 'smartdsp_public_visit_dedupe:';
const dedupeWindowMs = 30 * 60 * 1000;

export type CookieConsentPreferences = {
  version: 'cookie-consent-v1';
  necessary: true;
  performance: boolean;
  acceptedAt: string;
};

export type PublicVisitStats = {
  totalVisitors: number;
  todayVisitors: number;
  totalPageViews: number;
  todayPageViews: number;
  updatedAt: string | null;
};

export function getStoredCookieConsent(): CookieConsentPreferences | null {
  try {
    const raw = window.localStorage.getItem(cookieConsentStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentPreferences;
    return parsed?.necessary === true ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCookieConsent(performance: boolean) {
  const consent: CookieConsentPreferences = {
    version: 'cookie-consent-v1',
    necessary: true,
    performance,
    acceptedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(cookieConsentStorageKey, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent('smartdsp-cookie-consent-updated', { detail: consent }));
  return consent;
}

function getOrCreateVisitSessionId() {
  const existing = window.localStorage.getItem(publicVisitSessionStorageKey);
  if (existing) return existing;

  const nextId = createUuid();
  window.localStorage.setItem(publicVisitSessionStorageKey, nextId);
  return nextId;
}

function shouldSkipRecentPageView(path: string) {
  const key = `${visitDedupePrefix}${path}`;
  const lastRecordedAt = Number(window.sessionStorage.getItem(key) || '0');
  const now = Date.now();
  if (lastRecordedAt && now - lastRecordedAt < dedupeWindowMs) {
    return true;
  }

  window.sessionStorage.setItem(key, String(now));
  return false;
}

export async function recordPublicPageVisit(path: string) {
  const consent = getStoredCookieConsent();
  if (!consent?.performance) {
    return { sessionRecorded: false, pageViewRecorded: false, reason: 'performance_consent_required' };
  }

  const normalizedPath = path || '/';
  if (shouldSkipRecentPageView(normalizedPath)) {
    return { sessionRecorded: true, pageViewRecorded: false, reason: 'client_dedupe' };
  }

  const { data, error } = await (supabase as any).rpc('record_public_page_visit', {
    p_session_id: getOrCreateVisitSessionId(),
    p_path: normalizedPath,
    p_consent_version: consent.version,
    p_performance_consent: consent.performance,
    p_user_agent: window.navigator.userAgent,
  });

  if (error) throw error;
  return data as { sessionRecorded: boolean; pageViewRecorded: boolean; reason?: string };
}

export async function getPublicVisitStats(): Promise<PublicVisitStats> {
  const { data, error } = await (supabase as any).rpc('get_public_visit_stats');
  if (error) throw error;

  const stats = (data || {}) as Partial<PublicVisitStats>;
  return {
    totalVisitors: Number(stats.totalVisitors || 0),
    todayVisitors: Number(stats.todayVisitors || 0),
    totalPageViews: Number(stats.totalPageViews || 0),
    todayPageViews: Number(stats.todayPageViews || 0),
    updatedAt: stats.updatedAt || null,
  };
}
