import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { getSpdAssistantPageContext, getSpdAssistantRoute, type SpdAssistantPageContext } from '../../services/spd-assistant.service';
import { useAuthStore } from '../../stores/auth.store';
import type { UserRole } from '../../types/roles';

type SpdAssistantContextValue = {
  route: string;
  pageContext: SpdAssistantPageContext | null;
  pageNameTh: string;
  moduleNameTh: string;
  userRole: UserRole | null;
  isAuthenticated: boolean;
  isContextLoading: boolean;
  refreshContext: () => Promise<void>;
};

const SpdAssistantContext = createContext<SpdAssistantContextValue | null>(null);

function readRoute() {
  return getSpdAssistantRoute(window.location.pathname);
}

export function SpdAssistantProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuthStore();
  const [route, setRoute] = useState(readRoute);
  const [pageContext, setPageContext] = useState<SpdAssistantPageContext | null>(null);
  const [isContextLoading, setIsContextLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const updateRoute = () => {
      setRoute((currentRoute) => {
        const nextRoute = readRoute();
        return currentRoute === nextRoute ? currentRoute : nextRoute;
      });
    };

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    const notifyRouteChange = () => window.dispatchEvent(new Event('spd-assistant-routechange'));

    window.history.pushState = function pushState(...args) {
      originalPushState.apply(this, args);
      notifyRouteChange();
    };

    window.history.replaceState = function replaceState(...args) {
      originalReplaceState.apply(this, args);
      notifyRouteChange();
    };

    window.addEventListener('popstate', updateRoute);
    window.addEventListener('spd-assistant-routechange', updateRoute);
    updateRoute();

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', updateRoute);
      window.removeEventListener('spd-assistant-routechange', updateRoute);
    };
  }, []);

  const refreshContext = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!profile) {
      setPageContext(null);
      setIsContextLoading(false);
      return;
    }

    setIsContextLoading(true);

    try {
      const context = await getSpdAssistantPageContext(route);
      if (requestIdRef.current === requestId) {
        setPageContext(context);
      }
    } catch (error) {
      console.error('Failed to load SPD Assistant page context:', error);
      if (requestIdRef.current === requestId) {
        setPageContext(null);
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setIsContextLoading(false);
      }
    }
  }, [profile, route]);

  useEffect(() => {
    void refreshContext();
  }, [refreshContext]);

  const value = useMemo<SpdAssistantContextValue>(
    () => ({
      route,
      pageContext,
      pageNameTh: pageContext?.page_name_th ?? 'ไม่พบข้อมูลหน้า',
      moduleNameTh: pageContext?.module_name_th ?? 'ไม่พบข้อมูลโมดูล',
      userRole: profile?.role ?? null,
      isAuthenticated: Boolean(user),
      isContextLoading,
      refreshContext,
    }),
    [isContextLoading, pageContext, profile?.role, refreshContext, route, user],
  );

  return <SpdAssistantContext.Provider value={value}>{children}</SpdAssistantContext.Provider>;
}

export function useSpdAssistantContext() {
  const context = useContext(SpdAssistantContext);
  if (!context) {
    throw new Error('useSpdAssistantContext must be used inside SpdAssistantProvider');
  }

  return context;
}
