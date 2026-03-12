import { createClient } from '@supabase/supabase-js';

// Support both VITE_ and NEXT_PUBLIC_ prefixes for environment variables
const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
  'https://czurhanyrjgeicnbrnev.supabase.co'
).trim().replace(/\/$/, '');

const SUPABASE_KEY = (
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dXJoYW55cmpnZWljbmJybmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTExMDEsImV4cCI6MjA4NzQyNzEwMX0.LV4hsQEazpbv8AcLDrEASg8s3uGKmvMJ0FrvMOX6AWQ'
).trim();

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
