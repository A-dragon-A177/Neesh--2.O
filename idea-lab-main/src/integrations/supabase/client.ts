// Supabase Client Initialization
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!envUrl || !envKey) {
  console.warn('[SupabaseClient] Warning: VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is not defined in environment.');
}

const SUPABASE_URL = envUrl || 'https://placeholder.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = envKey || 'placeholder-anon-key';

// Global singleton to prevent multiple GoTrueClient instances under same storage key
const globalObj = typeof window !== 'undefined' ? (window as any) : (globalThis as any);

export const supabase = globalObj.__supabase_client__ || (globalObj.__supabase_client__ = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    debug: false,
  }
}));
