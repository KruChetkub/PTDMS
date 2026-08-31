import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { recordAuditLog, recordLoginAttempt } from '../services/audit.service';
import type { Profile } from '../types/database.types';
import { isPasswordPolicySatisfied } from '../features/auth/passwordPolicy';

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  permissions: string[];
  initialized: boolean;
  loading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  loadProfile: (userId: string) => Promise<Profile | null>;
  loadPermissions: () => Promise<string[]>;
  refreshProfile: () => Promise<Profile | null>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

function getPasswordUpdateError(error: { code?: string; message: string }) {
  if (error.code === 'same_password') {
    return new Error('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน');
  }

  if (error.code === 'weak_password') {
    return new Error('รหัสผ่านไม่ผ่านข้อกำหนดด้านความปลอดภัย');
  }

  return error;
}

let initializePromise: Promise<void> | null = null;
let authSubscription: { unsubscribe: () => void } | null = null;

function getSignInErrorMessage(message: string) {
  if (message === 'Invalid login credentials') {
    return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  }

  return message;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  permissions: [],
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
      const [profile, permissions] = user
        ? await Promise.all([get().loadProfile(user.id), get().loadPermissions()])
        : [null, []];

      set({ session, user, profile, permissions, initialized: true, loading: false });

      authSubscription?.unsubscribe();
      const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        const nextUser = nextSession?.user ?? null;
        const currentProfile = get().profile;
        const profileStillMatches = Boolean(nextUser && currentProfile?.user_id === nextUser.id);

        set({
          session: nextSession,
          user: nextUser,
          profile: nextUser ? (profileStillMatches ? currentProfile : null) : null,
          permissions: nextUser && profileStillMatches ? get().permissions : [],
          initialized: true,
          loading: nextUser ? !profileStillMatches : false,
        });

        if (!nextUser || profileStillMatches) {
          return;
        }

        window.setTimeout(() => {
          void (async () => {
            const [nextProfile, permissions] = await Promise.all([
              get().loadProfile(nextUser.id),
              get().loadPermissions(),
            ]);
            if (get().user?.id === nextUser.id) {
              set({ profile: nextProfile, permissions, loading: false });
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
        'user_id, employee_code, full_name, position, department, work_group, gender, education, birth_date, start_work_date, generation, employment_type, role, status, avatar_url, force_password_change, force_password_change_requested_at, force_password_change_requested_by, password_changed_at, created_at, updated_at',
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      set({ error: error.message });
      return null;
    }

    return data;
  },

  loadPermissions: async () => {
    const { data, error } = await (supabase as any).rpc('list_my_permissions');
    if (error) {
      set({ error: error.message });
      return [];
    }

    return Array.isArray(data) ? data.filter((item): item is string => typeof item === 'string') : [];
  },

  refreshProfile: async () => {
    const userId = get().user?.id;
    if (!userId) {
      return null;
    }

    const [profile, permissions] = await Promise.all([
      get().loadProfile(userId),
      get().loadPermissions(),
    ]);
    set({ profile, permissions });
    return profile;
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });

    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      void recordLoginAttempt({
        email: normalizedEmail,
        success: false,
        errorMessage: error.message,
      });
      set({ error: getSignInErrorMessage(error.message), loading: false });
      throw error;
    }

    const [profile, permissions] = data.user
      ? await Promise.all([get().loadProfile(data.user.id), get().loadPermissions()])
      : [null, []];
    set({ session: data.session, user: data.user, profile, permissions, loading: false });

    void recordLoginAttempt({
      email: normalizedEmail,
      success: true,
      accessToken: data.session?.access_token ?? null,
    });
  },

  signUp: async (email: string, password: string, fullName: string) => {
    if (!isPasswordPolicySatisfied(password)) {
      throw new Error('รหัสผ่านไม่ผ่านข้อกำหนดด้านความปลอดภัย');
    }

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
    if (!isPasswordPolicySatisfied(password)) {
      throw new Error('รหัสผ่านไม่ผ่านข้อกำหนดด้านความปลอดภัย');
    }

    set({ loading: true, error: null });

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      const passwordError = getPasswordUpdateError(error);
      set({ error: passwordError.message, loading: false });
      throw passwordError;
    }

    const { error: completionError } = await supabase.rpc('complete_forced_password_change');
    if (completionError) {
      set({ error: completionError.message, loading: false });
      throw completionError;
    }

    const profile = await get().refreshProfile();
    set({ profile, loading: false });
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

    set({ session: null, user: null, profile: null, permissions: [], loading: false });
  },

  clearError: () => set({ error: null }),
}));


