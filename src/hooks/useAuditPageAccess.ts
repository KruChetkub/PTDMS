import { useEffect } from 'react';
import { recordAuditLog } from '../services/audit.service';
import { useAuthStore } from '../stores/auth.store';

const lastPageAccessAt = new Map<string, number>();
const duplicateWindowMs = 2000;

type PageAccessOptions = {
  module: string;
  action: string;
  route: string;
  metadata?: Record<string, unknown>;
};

export function useAuditPageAccess({ module, action, route, metadata }: PageAccessOptions) {
  const userId = useAuthStore((state) => state.user?.id);
  const initialized = useAuthStore((state) => state.initialized);

  useEffect(() => {
    if (!initialized || !userId) {
      return;
    }

    const key = `${userId}:${route}:${action}`;
    const now = Date.now();
    const lastLoggedAt = lastPageAccessAt.get(key) ?? 0;
    if (now - lastLoggedAt < duplicateWindowMs) {
      return;
    }

    lastPageAccessAt.set(key, now);
    void recordAuditLog({
      module,
      action,
      route,
      targetType: 'page',
      targetId: route,
      metadata,
    });
  }, [action, initialized, metadata, module, route, userId]);
}
