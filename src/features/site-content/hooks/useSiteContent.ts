import { useEffect, useState } from 'react';
import { defaultSiteContent } from '../data/siteContent.defaults';
import {
  loadSiteContent,
  normalizeSiteContent,
  resetSiteContent,
  saveSiteContent,
  SITE_CONTENT_UPDATED_EVENT,
} from '../services/siteContent.storage';
import { loadSiteContentFromSupabase, saveSiteContentToSupabase } from '../services/siteContent.supabase';
import type { SiteContentState } from '../types/siteContent.types';

export function usePublishedSiteContent() {
  const [content, setContent] = useState<SiteContentState>(() => loadSiteContent());

  useEffect(() => {
    let isMounted = true;
    const syncContent = () => setContent(loadSiteContent());
    const handleCustomUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<SiteContentState>;
      setContent(customEvent.detail || loadSiteContent());
    };

    const loadPublishedContent = async () => {
      try {
        const row = await loadSiteContentFromSupabase();
        if (!isMounted || !row?.content) return;

        const nextContent = normalizeSiteContent(row.content);
        saveSiteContent(nextContent);
        setContent(nextContent);
      } catch (error) {
        console.warn('Site content Supabase load fallback:', error);
      }
    };

    window.addEventListener('storage', syncContent);
    window.addEventListener(SITE_CONTENT_UPDATED_EVENT, handleCustomUpdate);
    void loadPublishedContent();

    return () => {
      isMounted = false;
      window.removeEventListener('storage', syncContent);
      window.removeEventListener(SITE_CONTENT_UPDATED_EVENT, handleCustomUpdate);
    };
  }, []);

  return content;
}

export function useSiteContentDraft() {
  const [contentDraft, setContentDraft] = useState<SiteContentState>(() => loadSiteContent());
  const [loadingSource, setLoadingSource] = useState<'supabase' | 'local' | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDraftContent = async () => {
      try {
        const row = await loadSiteContentFromSupabase();
        if (!isMounted || !row?.content) return;

        const nextContent = normalizeSiteContent(row.content);
        saveSiteContent(nextContent);
        setContentDraft(nextContent);
        setLoadingSource('supabase');
      } catch (error) {
        console.warn('Site content Supabase draft fallback:', error);
        if (isMounted) {
          setLoadingSource('local');
        }
      }
    };

    void loadDraftContent();

    return () => {
      isMounted = false;
    };
  }, []);

  const saveDraft = async () => {
    try {
      await saveSiteContentToSupabase(contentDraft);
      saveSiteContent(contentDraft);
      return 'supabase' as const;
    } catch (error) {
      console.warn('Site content Supabase save fallback:', error);
      saveSiteContent(contentDraft);
      return 'local' as const;
    }
  };

  const resetDraft = () => {
    const nextContent = resetSiteContent();
    setContentDraft(nextContent);
  };

  const restoreDefaultDraft = () => {
    setContentDraft(defaultSiteContent);
  };

  return {
    contentDraft,
    setContentDraft,
    loadingSource,
    saveDraft,
    resetDraft,
    restoreDefaultDraft,
  };
}
