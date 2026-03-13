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

// Helper to clean environment variables (removes quotes and whitespace)
const cleanEnvVar = (value: string | undefined): string => {
  if (!value) return '';
  return value.trim().replace(/^["']|["']$/g, '').trim();
};

// Support both VITE_ and NEXT_PUBLIC_ prefixes for environment variables, plus process.env from vite define
const rawUrl = cleanEnvVar(
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
  (typeof process !== 'undefined' ? process.env.SUPABASE_URL : '')
);

const rawKey = cleanEnvVar(
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  (typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : '')
);

// This check needs to be broad to catch all possible variable names
// We also verify that the URL is actually valid to consider it "configured"
export const isConfigured = Boolean(
  isValidSupabaseUrl(rawUrl) && 
  rawKey && 
  rawKey !== 'placeholder-key'
);

export const SUPABASE_URL = isConfigured ? rawUrl.replace(/\/$/, '') : 'https://placeholder-project.supabase.co';
export const SUPABASE_KEY = isConfigured ? rawKey : 'placeholder-key';

// Optional: Add a log to your browser console to see exactly what is missing
if (!isConfigured) {
  if (!rawUrl || !rawKey) {
    console.error("Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Settings.");
  } else if (!isValidSupabaseUrl(rawUrl)) {
    console.error(`Supabase URL is invalid: "${rawUrl}". It must start with http:// or https://`);
  }
}

// Diagnostic check to help users identify network issues
// Only run if we actually have a valid-looking configuration
if (typeof window !== 'undefined' && isConfigured && !SUPABASE_URL.includes('placeholder-project')) {
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
      if (typeof window !== 'undefined') {
        (window as any).supabaseConnectionError = err.message;
      }
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
