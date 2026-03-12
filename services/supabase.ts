import { createClient } from '@supabase/supabase-js';

// Support both VITE_ and NEXT_PUBLIC_ prefixes for environment variables
const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
  'https://czurhanyrjgeicnbrnev.supabase.co';

const SUPABASE_KEY = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dXJoYW55cmpnZWljbmJybmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTExMDEsImV4cCI6MjA4NzQyNzEwMX0.LV4hsQEazpbv8AcLDrEASg8s3uGKmvMJ0FrvMOX6AWQ';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase configuration is missing. Please check your environment variables.');
}

// Diagnostic check to help users identify network issues
if (typeof window !== 'undefined') {
  fetch(SUPABASE_URL, { method: 'HEAD', mode: 'no-cors' })
    .catch(() => {
      console.warn('Supabase Connectivity Warning: The browser could not reach the Supabase URL. This usually means the project is paused, the URL is incorrect, or your network is blocking the connection.');
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
