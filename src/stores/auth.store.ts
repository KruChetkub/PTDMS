import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { recordAuditLog } from '../services/audit.service';
import type { Profile } from '../types/database.types';

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  initialized: boolean;
  loading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  loadProfile: (userId: string) => Promise<Profile | null>;
  refreshProfile: () => Promise<Profile | null>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

let initializePromise: Promise<void> | null = null;
let authSubscription: { unsubscribe: () => void } | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  initialized: false,
  loading: false,
  error: null,

  initialize: async () => {
    if (get().initialized) {
      return;
    }

    if (initializePromise) {
      return initializePromise;
    }

    initializePromise = (async () => {
      set({ loading: true, error: null });

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        set({ error: error.message, initialized: true, loading: false });
        return;
      }

      const session = data.session;
      const user = session?.user ?? null;
      const profile = user ? await get().loadProfile(user.id) : null;

      set({ session, user, profile, initialized: true, loading: false });

      authSubscription?.unsubscribe();
      const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        const nextUser = nextSession?.user ?? null;
        const currentProfile = get().profile;
        const profileStillMatches = Boolean(nextUser && currentProfile?.user_id === nextUser.id);

        set({
          session: nextSession,
          user: nextUser,
          profile: nextUser ? (profileStillMatches ? currentProfile : null) : null,
          initialized: true,
          loading: nextUser ? !profileStillMatches : false,
        });

        if (!nextUser || profileStillMatches) {
          return;
        }

        window.setTimeout(() => {
          void (async () => {
            const nextProfile = await get().loadProfile(nextUser.id);
            if (get().user?.id === nextUser.id) {
              set({ profile: nextProfile, loading: false });
            }
          })();
        }, 0);
      });

      authSubscription = listener.subscription;
    })();

    try {
      await initializePromise;
    } finally {
      initializePromise = null;
    }
  },

  loadProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'user_id, employee_code, full_name, position, department, work_group, gender, education, birth_date, start_work_date, generation, employment_type, role, status, avatar_url, created_at, updated_at',
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      set({ error: error.message });
      return null;
    }

    return data;
  },

  refreshProfile: async () => {
    const userId = get().user?.id;
    if (!userId) {
      return null;
    }

    const profile = await get().loadProfile(userId);
    set({ profile });
    return profile;
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error: error.message, loading: false });
      throw error;
    }

    const profile = data.user ? await get().loadProfile(data.user.id) : null;
    set({ session: data.session, user: data.user, profile, loading: false });
  },

  signUp: async (email: string, password: string, fullName: string) => {
    set({ loading: true, error: null });

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      set({ error: error.message, loading: false });
      throw error;
    }

    set({ loading: false });
  },

  requestPasswordReset: async (email: string) => {
    set({ loading: true, error: null });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/set-new-password`,
    });

    if (error) {
      set({ error: error.message, loading: false });
      throw error;
    }

    set({ loading: false });
  },

  updatePassword: async (password: string) => {
    set({ loading: true, error: null });

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      set({ error: error.message, loading: false });
      throw error;
    }

    set({ loading: false });
  },

  signOut: async () => {
    set({ loading: true, error: null });

    const currentUserId = get().user?.id ?? null;
    await recordAuditLog({
      module: 'auth',
      action: 'logout',
      targetType: 'user',
      targetId: currentUserId,
    });

    const { error } = await supabase.auth.signOut();
    if (error) {
      set({ error: error.message, loading: false });
      throw error;
    }

    set({ session: null, user: null, profile: null, loading: false });
  },

  clearError: () => set({ error: null }),
}));


