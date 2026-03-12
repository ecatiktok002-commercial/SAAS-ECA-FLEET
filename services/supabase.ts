import { createClient } from '@supabase/supabase-js';

// Prioritize environment variables for Vercel/Production
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://czurhanyrjgeicnbrnev.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dXJoYW55cmpnZWljbmJybmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTExMDEsImV4cCI6MjA4NzQyNzEwMX0.LV4hsQEazpbv8AcLDrEASg8s3uGKmvMJ0FrvMOX6AWQ';

if (!SUPABASE_KEY) {
  console.warn('Supabase API Key is missing.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
