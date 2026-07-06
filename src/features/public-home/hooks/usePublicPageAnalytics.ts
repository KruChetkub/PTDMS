import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { recordPublicPageVisit } from '../../../services/public-analytics.service';

export function usePublicPageAnalytics() {
  const location = useLocation();

  useEffect(() => {
    const recordVisit = () => {
      void recordPublicPageVisit(`${location.pathname}${location.search}`)
        .then(() => window.dispatchEvent(new Event('smartdsp-public-analytics-updated')))
        .catch((error) => {
          console.error('Failed to record public page visit:', error);
        });
    };

    recordVisit();
    window.addEventListener('smartdsp-cookie-consent-updated', recordVisit);
    return () => window.removeEventListener('smartdsp-cookie-consent-updated', recordVisit);
  }, [location.pathname, location.search]);
}