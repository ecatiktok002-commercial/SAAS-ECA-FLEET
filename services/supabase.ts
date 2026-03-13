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

const DEFAULT_URL = 'https://czurhanyrjgeicnbrnev.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dXJoYW55cmpnZWljbmJybmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTExMDEsImV4cCI6MjA4NzQyNzEwMX0.LV4hsQEazpbv8AcLDrEASg8s3uGKmvMJ0FrvMOX6AWQ';

// Support both VITE_ and NEXT_PUBLIC_ prefixes for environment variables
const rawUrl = (
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
  DEFAULT_URL
).trim().replace(/\/$/, '');

const rawKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  DEFAULT_KEY
).trim();

// Final validation - if the provided URL is invalid, fallback to default
const SUPABASE_URL = isValidSupabaseUrl(rawUrl) ? rawUrl : DEFAULT_URL;
const SUPABASE_KEY = rawKey || DEFAULT_KEY;

if (!isValidSupabaseUrl(rawUrl) && (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL)) {
  console.warn('Invalid Supabase URL provided in environment variables. Falling back to demo project.');
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase configuration is missing. Please check your environment variables.');
}

// Diagnostic check to help users identify network issues
if (typeof window !== 'undefined') {
  const isDefaultProject = SUPABASE_URL.includes('czurhanyrjgeicnbrnev');
  
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
      const message = isDefaultProject 
        ? 'The default Supabase demo project appears to be unreachable or paused. Please set up your own Supabase project in the Settings menu for full functionality.'
        : 'Could not reach your Supabase URL. Please check if the project is paused or if your network is blocking the connection.';
      console.error(`Supabase Connectivity Error: ${message}`);
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
