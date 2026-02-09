import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Ces variables devront être dans ton .env plus tard
// Pour l'instant, on met des placeholders si le .env n'est pas prêt
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://votre-url.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'votre-cle-api';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
