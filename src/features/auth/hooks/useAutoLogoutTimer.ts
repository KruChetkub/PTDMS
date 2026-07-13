import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/auth.store';
import {
  DEFAULT_AUTO_LOGOUT_MINUTES,
  loadLoginSecuritySettings,
  SYSTEM_SETTINGS_UPDATED_EVENT,
  type LoginSecuritySettings,
} from '../../../services/system-settings.service';
import { reportClientError } from '../../../utils/errorHandling';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const;

export function useAutoLogoutTimer(enabled: boolean) {
  const navigate = useNavigate();
  const signOut = useAuthStore((state) => state.signOut);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minutesRef = useRef(DEFAULT_AUTO_LOGOUT_MINUTES);
  const signingOutRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isMounted = true;

    const clearAutoLogoutTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const runAutoLogout = async () => {
      if (signingOutRef.current) {
        return;
      }

      signingOutRef.current = true;

      try {
        await signOut();
      } finally {
        navigate('/login', { replace: true, state: { reason: 'auto-logout' } });
      }
    };

    const resetAutoLogoutTimer = () => {
      clearAutoLogoutTimer();
      timerRef.current = setTimeout(() => {
        void runAutoLogout();
      }, minutesRef.current * 60 * 1000);
    };

    const loadSettings = async () => {
      try {
        const settings = await loadLoginSecuritySettings();
        if (!isMounted) return;

        minutesRef.current = settings.autoLogoutMinutes;
        resetAutoLogoutTimer();
      } catch (error) {
        void reportClientError('Auto logout setting fallback:', error);
        minutesRef.current = DEFAULT_AUTO_LOGOUT_MINUTES;
        resetAutoLogoutTimer();
      }
    };

    const handleSettingsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<LoginSecuritySettings>;
      if (customEvent.detail?.autoLogoutMinutes) {
        minutesRef.current = customEvent.detail.autoLogoutMinutes;
        resetAutoLogoutTimer();
        return;
      }

      void loadSettings();
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetAutoLogoutTimer, { passive: true });
    });
    window.addEventListener(SYSTEM_SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
    void loadSettings();

    return () => {
      isMounted = false;
      clearAutoLogoutTimer();
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetAutoLogoutTimer);
      });
      window.removeEventListener(SYSTEM_SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
    };
  }, [enabled, navigate, signOut]);
}
