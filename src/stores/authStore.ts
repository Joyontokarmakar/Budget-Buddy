import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import type { Profile, Language, ThemeMode } from '../types';
import i18n from '../i18n/config';
import { db } from '../services/db';

interface AuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, country: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  initialize: () => Promise<void>;
  switchAccount: (targetUserId: string) => Promise<void>;
  addAnotherAccount: () => Promise<void>;
  signOutAccount: (targetUserId: string) => Promise<void>;
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
  show_status_dots: true,
  status_dots_count: 40,
  show_shop_name: true,
  onboarded: true,
  residence_country: 'Germany',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function parseUserAgent(ua: string): string {
  let os = 'Unknown OS';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Unknown Browser';
  if (/Chrome/i.test(ua) && !/Edge|Edg/i.test(ua) && !/OPR|Opera/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edge|Edg/i.test(ua)) browser = 'Edge';
  else if (/OPR|Opera/i.test(ua)) browser = 'Opera';

  return `${browser} on ${os}`;
}

function getOrCreateDeviceSessionKey(): string {
  let key = localStorage.getItem('bb_device_session_key');
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem('bb_device_session_key', key);
  }
  return key;
}

async function saveActiveProfileSession(profile: Profile, _user: any) {
  const saved = localStorage.getItem('bb_saved_profiles');
  const profiles = saved ? JSON.parse(saved) : [];
  
  let access_token = 'mock-access-token';
  let refresh_token = 'mock-refresh-token';
  
  if (isSupabaseConfigured) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      access_token = data.session.access_token;
      refresh_token = data.session.refresh_token;
    }
  }

  const profileInfo = {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    session_tokens: { access_token, refresh_token },
    avatar_url: (profile as any).avatar_url || null,
    last_active: new Date().toISOString()
  };

  const idx = profiles.findIndex((p: any) => p.id === profile.id);
  if (idx !== -1) {
    profiles[idx] = profileInfo;
  } else {
    profiles.push(profileInfo);
  }
  localStorage.setItem('bb_saved_profiles', JSON.stringify(profiles));
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;

    set({ loading: true });

    const checkAndRegisterSession = async (userProfile: Profile, activeUser: any) => {
      try {
        const sessionKey = getOrCreateDeviceSessionKey();
        const deviceName = parseUserAgent(navigator.userAgent);
        await db.createUserSession(userProfile.id, {
          session_key: sessionKey,
          device_name: deviceName,
          user_agent: navigator.userAgent
        });
        await saveActiveProfileSession(userProfile, activeUser);
        
        // Verify if session was revoked remotely
        const activeSessions = await db.getUserSessions(userProfile.id);
        const currentExists = activeSessions.some(s => s.session_key === sessionKey);
        if (!currentExists && activeSessions.length > 0) {
          // Remotely revoked! Log out.
          await get().signOut();
        }
      } catch (err) {
        console.error('Session sync error:', err);
      }
    };

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
        await checkAndRegisterSession(parsedProfile, parsedUser);
      }
      set({ initialized: true, loading: false });
      return;
    }

    const getOrCreateProfile = async (authUser: any): Promise<Profile | null> => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profile) {
          let updatedProfile = profile;
          const googleAvatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;
          const googleName = authUser.user_metadata?.full_name || authUser.user_metadata?.name;
          
          const updates: Partial<Profile> = {};
          if (!profile.avatar_url && googleAvatar) {
            updates.avatar_url = googleAvatar;
          }
          if ((!profile.name || profile.name === 'Student') && googleName) {
            updates.name = googleName;
          }

          if (Object.keys(updates).length > 0) {
            try {
              const { data: newProf } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', profile.id)
                .select()
                .single();
              if (newProf) {
                updatedProfile = newProf;
              }
            } catch (err) {
              console.error('Error syncing Google profile updates:', err);
            }
          }
          return updatedProfile;
        }

        // Profile doesn't exist, create it (fallback)
        const googleName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'Student';
        const googleAvatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null;
        
        const newProfile = {
          id: authUser.id,
          name: googleName,
          email: authUser.email || null,
          preferred_language: 'de' as Language,
          theme_preference: 'system' as ThemeMode,
          monthly_budget: 700.00,
          avatar_url: googleAvatar,
          onboarded: false,
          residence_country: authUser.user_metadata?.residence_country || 'Germany',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: createdProfile, error: insertError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting fallback profile:', insertError);
          return newProfile as Profile;
        }

        return createdProfile;
      } catch (err) {
        console.error('getOrCreateProfile exception:', err);
        return null;
      }
    };

    try {
      // 1. Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        set({ user: session.user });
        const userProfile = await getOrCreateProfile(session.user);
        if (userProfile) {
          set({ profile: userProfile });
          applyLanguageAndTheme(userProfile.preferred_language, userProfile.theme_preference);
          await checkAndRegisterSession(userProfile, session.user);
        }
      }

      // 2. Listen for auth changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          set({ user: session.user });
          const userProfile = await getOrCreateProfile(session.user);
          if (userProfile) {
            set({ profile: userProfile });
            applyLanguageAndTheme(userProfile.preferred_language, userProfile.theme_preference);
            await checkAndRegisterSession(userProfile, session.user);
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
      // Try to find if user already existed to keep their ID
      const savedProfiles = JSON.parse(localStorage.getItem('bb_saved_profiles') || '[]');
      const existingProfile = savedProfiles.find((p: any) => p.email.toLowerCase() === email.toLowerCase());
      
      const userId = existingProfile ? existingProfile.id : crypto.randomUUID();
      const mockUser = { id: userId, email, user_metadata: { name: email.split('@')[0] } };
      const mockProfile = { ...MOCK_PROFILE, id: userId, email, name: email.split('@')[0] };

      localStorage.setItem('bb-mock-user', JSON.stringify(mockUser));
      localStorage.setItem('bb-mock-profile', JSON.stringify(mockProfile));

      set({ user: mockUser, profile: mockProfile, loading: false });
      applyLanguageAndTheme(mockProfile.preferred_language, mockProfile.theme_preference);

      // Register session
      const sessionKey = getOrCreateDeviceSessionKey();
      const deviceName = parseUserAgent(navigator.userAgent);
      await db.createUserSession(mockProfile.id, {
        session_key: sessionKey,
        device_name: deviceName,
        user_agent: navigator.userAgent
      });
      await saveActiveProfileSession(mockProfile, mockUser);

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

      // Register session
      const sessionKey = getOrCreateDeviceSessionKey();
      const deviceName = parseUserAgent(navigator.userAgent);
      await db.createUserSession(profile.id, {
        session_key: sessionKey,
        device_name: deviceName,
        user_agent: navigator.userAgent
      });
      await saveActiveProfileSession(profile, data.user);

      return { error: null };
    } catch (error: any) {
      set({ loading: false });
      return { error: error.message || error };
    }
  },

  signUp: async (email, password, name, country) => {
    set({ loading: true });

    if (!isSupabaseConfigured) {
      // Mock Sign Up
      const mockUser = { id: crypto.randomUUID(), email, user_metadata: { name } };
      const mockProfile = {
        ...MOCK_PROFILE,
        id: mockUser.id,
        name,
        email,
        onboarded: false, // New users need onboarding setup wizard
        residence_country: country,
      };

      localStorage.setItem('bb-mock-user', JSON.stringify(mockUser));
      localStorage.setItem('bb-mock-profile', JSON.stringify(mockProfile));

      set({ user: mockUser, profile: mockProfile, loading: false });
      applyLanguageAndTheme(mockProfile.preferred_language, mockProfile.theme_preference);

      // Register session
      const sessionKey = getOrCreateDeviceSessionKey();
      const deviceName = parseUserAgent(navigator.userAgent);
      await db.createUserSession(mockProfile.id, {
        session_key: sessionKey,
        device_name: deviceName,
        user_agent: navigator.userAgent
      });
      await saveActiveProfileSession(mockProfile, mockUser);

      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, residence_country: country },
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

      let finalProfile = profile;
      if (pError) {
        // Fallback profile insert in case trigger didn't run (e.g. local emulator issues)
        const newProfile = {
          id: data.user!.id,
          name,
          email,
          preferred_language: 'de' as Language,
          theme_preference: 'system' as ThemeMode,
          monthly_budget: 700.00,
          onboarded: false,
          residence_country: country,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { data: insProfile } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();
        
        finalProfile = insProfile || newProfile as Profile;
        set({ user: data.user, profile: finalProfile });
      } else {
        set({ user: data.user, profile });
      }

      if (finalProfile) {
        applyLanguageAndTheme(finalProfile.preferred_language, finalProfile.theme_preference);
        // Register session
        const sessionKey = getOrCreateDeviceSessionKey();
        const deviceName = parseUserAgent(navigator.userAgent);
        await db.createUserSession(finalProfile.id, {
          session_key: sessionKey,
          device_name: deviceName,
          user_agent: navigator.userAgent
        });
        await saveActiveProfileSession(finalProfile, data.user);
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

    const userId = get().profile?.id;
    if (userId) {
      try {
        const sessionKey = getOrCreateDeviceSessionKey();
        const activeSessions = await db.getUserSessions(userId);
        const currentSession = activeSessions.find(s => s.session_key === sessionKey);
        if (currentSession) {
          await db.deleteUserSession(userId, currentSession.id);
        }
        
        // Remove from saved profiles
        const saved = localStorage.getItem('bb_saved_profiles');
        if (saved) {
          const profiles = JSON.parse(saved);
          const filtered = profiles.filter((p: any) => p.id !== userId);
          localStorage.setItem('bb_saved_profiles', JSON.stringify(filtered));
        }
      } catch (err) {
        console.error('Error clearing session:', err);
      }
    }

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

  switchAccount: async (targetUserId: string) => {
    set({ loading: true });
    try {
      const saved = localStorage.getItem('bb_saved_profiles');
      if (!saved) throw new Error('No saved profiles found');

      const profiles = JSON.parse(saved);
      const targetProfile = profiles.find((p: any) => p.id === targetUserId);
      if (!targetProfile) throw new Error('Target profile not found');

      if (!isSupabaseConfigured) {
        // Mock switch: restore their local user and profile info
        const mockUser = { id: targetProfile.id, email: targetProfile.email, user_metadata: { name: targetProfile.name } };
        const mockProfile = { ...MOCK_PROFILE, id: targetProfile.id, email: targetProfile.email, name: targetProfile.name };

        localStorage.setItem('bb-mock-user', JSON.stringify(mockUser));
        localStorage.setItem('bb-mock-profile', JSON.stringify(mockProfile));

        set({ user: mockUser, profile: mockProfile, loading: false });
        applyLanguageAndTheme(mockProfile.preferred_language, mockProfile.theme_preference);
        
        // Register/update session activity
        const sessionKey = getOrCreateDeviceSessionKey();
        const deviceName = parseUserAgent(navigator.userAgent);
        await db.createUserSession(targetProfile.id, {
          session_key: sessionKey,
          device_name: deviceName,
          user_agent: navigator.userAgent
        });
        await saveActiveProfileSession(mockProfile, mockUser);

        window.location.reload(); // Force page refresh to update all contexts
        return;
      }

      // Supabase switch
      const { data, error } = await supabase.auth.setSession({
        access_token: targetProfile.session_tokens.access_token,
        refresh_token: targetProfile.session_tokens.refresh_token
      });

      if (error) throw error;

      if (data.user) {
        const { data: profile, error: pError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (pError) throw pError;

        set({ user: data.user, profile, loading: false });
        applyLanguageAndTheme(profile.preferred_language, profile.theme_preference);

        // Register session
        const sessionKey = getOrCreateDeviceSessionKey();
        const deviceName = parseUserAgent(navigator.userAgent);
        await db.createUserSession(profile.id, {
          session_key: sessionKey,
          device_name: deviceName,
          user_agent: navigator.userAgent
        });
        await saveActiveProfileSession(profile, data.user);

        window.location.reload();
      }
    } catch (err: any) {
      set({ loading: false });
      alert(`Could not switch account: Session expired or invalid.`);
      get().signOutAccount(targetUserId);
    }
  },

  addAnotherAccount: async () => {
    // Sign out from supabase session/mock active states only, leaving bb_saved_profiles intact
    set({ loading: true });
    
    if (!isSupabaseConfigured) {
      localStorage.removeItem('bb-mock-user');
      localStorage.removeItem('bb-mock-profile');
      set({ user: null, profile: null, loading: false });
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error(err);
    } finally {
      set({ user: null, profile: null, loading: false });
    }
  },

  signOutAccount: async (targetUserId: string) => {
    // Delete session from DB
    try {
      const sessionKey = getOrCreateDeviceSessionKey();
      const activeSessions = await db.getUserSessions(targetUserId);
      const currentSession = activeSessions.find(s => s.session_key === sessionKey);
      if (currentSession) {
        await db.deleteUserSession(targetUserId, currentSession.id);
      }
    } catch (err) {
      console.error(err);
    }

    const saved = localStorage.getItem('bb_saved_profiles');
    if (saved) {
      const profiles = JSON.parse(saved);
      const filtered = profiles.filter((p: any) => p.id !== targetUserId);
      localStorage.setItem('bb_saved_profiles', JSON.stringify(filtered));
    }

    // If signed out account was the current active one, reset authState
    if (get().profile?.id === targetUserId) {
      if (!isSupabaseConfigured) {
        localStorage.removeItem('bb-mock-user');
        localStorage.removeItem('bb-mock-profile');
      } else {
        await supabase.auth.signOut();
      }
      set({ user: null, profile: null });
      window.location.reload();
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
