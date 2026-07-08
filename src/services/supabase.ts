import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.DEV) {
    console.log('Local developer environment loaded. Running on fallback mock services.');
  }
}

// Fallback to generic placeholder URL to prevent initialization crash while hiding tech-stack details
export const supabase = createClient(
  supabaseUrl || 'https://api.cloud-db.internal',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      storageKey: 'bb-session-state', // Custom generic storage key to disguise sb-auth-token in localStorage
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

