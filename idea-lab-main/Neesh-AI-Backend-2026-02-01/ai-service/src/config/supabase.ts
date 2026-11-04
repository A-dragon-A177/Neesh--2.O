import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  // Allow test environments to skip; fail hard otherwise
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
}

const resolvedUrl = supabaseUrl || 'https://mock-project.supabase.co';
const resolvedKey = supabaseKey || 'mock-service-role-key-for-test-environments';

export const supabase = createClient(resolvedUrl, resolvedKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      Authorization: `Bearer ${resolvedKey}`,
    },
  },
});
