import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { Database } from '@/types/db';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env and fill in ' +
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart Expo.',
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Web: let Supabase pick the session out of the magic-link redirect URL, and use
    // the implicit flow so the link works even when opened outside the tab that
    // requested it (PKCE needs a verifier stored in that exact browser context).
    // Native: persist with AsyncStorage (its web shim breaks on window access).
    ...(Platform.OS === 'web'
      ? { detectSessionInUrl: true, flowType: 'implicit' as const }
      : { storage: AsyncStorage, detectSessionInUrl: false }),
    autoRefreshToken: true,
    persistSession: true,
  },
});
