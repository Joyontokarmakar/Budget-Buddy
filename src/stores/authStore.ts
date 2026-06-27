import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import type { Profile, Language, ThemeMode } from '../types';
import i18n from '../i18n/config';

interface AuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  initialize: () => Promise<void>;
}

const MOCK_USER = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'student@example.de',
  user_metadata: { name: 'Max Mustermann' },
};

const MOCK_PROFILE: Profile = {
  id: '00000000-0000-0000-0000-000000000000',
  name: 'Max Mustermann',
  email: 'student@example.de',
  preferred_language: 'de',
  theme_preference: 'system',
  monthly_budget: 700.00,
  house_rent: 264.50,
  health_insurance: 151.42,
  radio_bill: 18.36,
  mobile_bill: 10.00,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;

    set({ loading: true });

    if (!isSupabaseConfigured) {
      // Local development/mock fallback
      const savedUser = localStorage.getItem('bb-mock-user');
      const savedProfile = localStorage.getItem('bb-mock-profile');

      if (savedUser && savedProfile) {
        const parsedUser = JSON.parse(savedUser);
        const parsedProfile = JSON.parse(savedProfile);
        set({ user: parsedUser, profile: parsedProfile });

        // Apply theme and language from mock profile
        applyLanguageAndTheme(parsedProfile.preferred_language, parsedProfile.theme_preference);
      }
      set({ initialized: true, loading: false });
      return;
    }

    try {
      // 1. Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        set({ user: session.user });
        
        // Fetch profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          set({ profile });
          applyLanguageAndTheme(profile.preferred_language, profile.theme_preference);
        } else if (error) {
          console.error('Error fetching profile:', error);
        }
      }

      // 2. Listen for auth changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          set({ user: session.user });
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            set({ profile });
            applyLanguageAndTheme(profile.preferred_language, profile.theme_preference);
          }
        } else {
          set({ user: null, profile: null });
        }
      });
    } catch (e) {
      console.error('Auth initialization error:', e);
    } finally {
      set({ initialized: true, loading: false });
    }
  },

  signIn: async (email, password) => {
    set({ loading: true });

    if (!isSupabaseConfigured) {
      // Successful mock log in
      const mockUser = { ...MOCK_USER, email };
      const mockProfile = { ...MOCK_PROFILE, email, name: email.split('@')[0] };

      localStorage.setItem('bb-mock-user', JSON.stringify(mockUser));
      localStorage.setItem('bb-mock-profile', JSON.stringify(mockProfile));

      set({ user: mockUser, profile: mockProfile, loading: false });
      applyLanguageAndTheme(mockProfile.preferred_language, mockProfile.theme_preference);
      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Fetch profile details
      const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (pError) throw pError;

      set({ user: data.user, profile });
      applyLanguageAndTheme(profile.preferred_language, profile.theme_preference);
      return { error: null };
    } catch (error: any) {
      set({ loading: false });
      return { error: error.message || error };
    }
  },

  signUp: async (email, password, name) => {
    set({ loading: true });

    if (!isSupabaseConfigured) {
      // Mock Sign Up
      const mockUser = { id: crypto.randomUUID(), email, user_metadata: { name } };
      const mockProfile = {
        ...MOCK_PROFILE,
        id: mockUser.id,
        name,
        email,
      };

      localStorage.setItem('bb-mock-user', JSON.stringify(mockUser));
      localStorage.setItem('bb-mock-profile', JSON.stringify(mockProfile));

      set({ user: mockUser, profile: mockProfile, loading: false });
      applyLanguageAndTheme(mockProfile.preferred_language, mockProfile.theme_preference);
      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (error) throw error;

      // Wait a brief moment for database trigger handle_new_user to finish
      await new Promise(resolve => setTimeout(resolve, 1500));

      const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user!.id)
        .single();

      if (pError) {
        // Fallback profile insert in case trigger didn't run (e.g. local emulator issues)
        const newProfile = {
          id: data.user!.id,
          name,
          email,
          preferred_language: 'de' as Language,
          theme_preference: 'system' as ThemeMode,
          monthly_budget: 700.00,
        };
        const { data: insProfile } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();
        
        set({ user: data.user, profile: insProfile || newProfile as Profile });
      } else {
        set({ user: data.user, profile });
      }

      set({ loading: false });
      return { error: null };
    } catch (error: any) {
      set({ loading: false });
      return { error: error.message || error };
    }
  },

  signInWithGoogle: async () => {
    if (!isSupabaseConfigured) {
      // Mock Google Login
      const mockUser = MOCK_USER;
      const mockProfile = MOCK_PROFILE;

      localStorage.setItem('bb-mock-user', JSON.stringify(mockUser));
      localStorage.setItem('bb-mock-profile', JSON.stringify(mockProfile));

      set({ user: mockUser, profile: mockProfile });
      applyLanguageAndTheme(mockProfile.preferred_language, mockProfile.theme_preference);
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    return { error };
  },

  signOut: async () => {
    set({ loading: true });

    if (!isSupabaseConfigured) {
      localStorage.removeItem('bb-mock-user');
      localStorage.removeItem('bb-mock-profile');
      set({ user: null, profile: null, loading: false });
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, profile: null, loading: false });
      return { error: null };
    } catch (error: any) {
      set({ loading: false });
      return { error: error.message || error };
    }
  },

  resetPassword: async (email) => {
    set({ loading: true });

    if (!isSupabaseConfigured) {
      set({ loading: false });
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      set({ loading: false });
      return { error: null };
    } catch (error: any) {
      set({ loading: false });
      return { error: error.message || error };
    }
  },

  updatePassword: async (password) => {
    set({ loading: true });
    if (!isSupabaseConfigured) {
      set({ loading: false });
      return { error: null };
    }
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      set({ loading: false });
      return { error: null };
    } catch (error: any) {
      set({ loading: false });
      return { error: error.message || error };
    }
  },

  updateProfile: async (updates) => {
    const currentProfile = get().profile;
    if (!currentProfile) return { error: 'No active profile found' };

    const newProfile = { ...currentProfile, ...updates, updated_at: new Date().toISOString() };
    set({ profile: newProfile });

    // Instantly apply visual preferences locally
    if (updates.preferred_language) {
      i18n.changeLanguage(updates.preferred_language);
    }
    if (updates.theme_preference) {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      if (updates.theme_preference === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(updates.theme_preference);
      }
      localStorage.setItem('budgetbuddy-theme', updates.theme_preference);
    }

    if (!isSupabaseConfigured) {
      localStorage.setItem('bb-mock-profile', JSON.stringify(newProfile));
      return { error: null };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', currentProfile.id);

      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      // Revert state if failed
      set({ profile: currentProfile });
      return { error: error.message || error };
    }
  },
}));

function applyLanguageAndTheme(lang: Language, theme: ThemeMode) {
  // 1. Language
  i18n.changeLanguage(lang);

  // 2. Theme
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
  }
  localStorage.setItem('budgetbuddy-theme', theme);
}
