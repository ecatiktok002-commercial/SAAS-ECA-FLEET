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

// Support both VITE_ and NEXT_PUBLIC_ prefixes for environment variables
const rawUrl = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const SUPABASE_URL = isValidSupabaseUrl(rawUrl) ? rawUrl.replace(/\/$/, '') : 'https://placeholder-project.supabase.co';
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim() || 'placeholder-key';

if (!isValidSupabaseUrl(rawUrl) || !SUPABASE_KEY || SUPABASE_KEY === 'placeholder-key') {
  console.error('Supabase configuration is missing or invalid. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
}

// Diagnostic check to help users identify network issues
if (typeof window !== 'undefined' && SUPABASE_URL && SUPABASE_KEY) {
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
    .catch(() => {
      console.error('Supabase Connectivity Error: Could not reach your Supabase URL. Please check if the project is paused or if your network is blocking the connection.');
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
