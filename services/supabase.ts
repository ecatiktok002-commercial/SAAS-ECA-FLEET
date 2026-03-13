import { createClient } from '@supabase/supabase-js';

// Helper to validate if a string is a valid HTTP/HTTPS URL
const isValidSupabaseUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// Support both VITE_ and NEXT_PUBLIC_ prefixes for environment variables, plus process.env from vite define
const rawUrl = (
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
  (typeof process !== 'undefined' ? process.env.SUPABASE_URL : '') ||
  ''
).trim();

const rawKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  (typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : '') ||
  ''
).trim();

// This check needs to be broad to catch all possible variable names
export const isConfigured = Boolean(
  (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || (typeof process !== 'undefined' && process.env.SUPABASE_URL)) &&
  (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (typeof process !== 'undefined' && process.env.SUPABASE_ANON_KEY))
);

const SUPABASE_URL = isConfigured && isValidSupabaseUrl(rawUrl) ? rawUrl.replace(/\/$/, '') : 'https://placeholder-project.supabase.co';
const SUPABASE_KEY = rawKey || 'placeholder-key';

// Optional: Add a log to your browser console to see exactly what is missing
if (!isConfigured) {
  console.error("Environment variables missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
}

// Diagnostic check to help users identify network issues
if (typeof window !== 'undefined' && isConfigured) {
  fetch(`${SUPABASE_URL}/rest/v1/`, { 
    method: 'GET', 
    headers: { 'apikey': SUPABASE_KEY } 
  })
    .then(res => {
      if (!res.ok && res.status === 401) {
        console.warn('Supabase Auth Warning: The API key might be invalid or expired.');
      } else if (res.ok) {
        console.log('Supabase Connection: Success');
      }
    })
    .catch((err) => {
      console.error(`Supabase Connectivity Error: Could not reach ${SUPABASE_URL}. Error: ${err.message}`);
      console.error('This usually means the project is paused in Supabase or your network is blocking the connection.');
    });
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: { 'x-application-name': 'fleet-track-calendar' },
  },
  db: {
    schema: 'public'
  }
});
