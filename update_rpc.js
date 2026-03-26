import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read env vars
const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) {
    env[key.trim()] = val.join('=').trim();
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_SERVICE_ROLE_KEY'] || env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = `
CREATE OR REPLACE FUNCTION current_subscriber_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    -- 1. Check if user is a subscriber (by ID or by matching email prefix to name)
    (SELECT id FROM public.subscribers 
     WHERE id = auth.uid() 
        OR name ILIKE (SELECT SPLIT_PART(email, '@', 1) FROM auth.users WHERE id = auth.uid())
     ORDER BY CASE WHEN tier != 'Tier 1' THEN 0 ELSE 1 END
     LIMIT 1)
    UNION ALL
    -- 2. Check if user is an agent in staff_members
    SELECT subscriber_id FROM public.staff_members 
    WHERE id = auth.uid() OR access_id = auth.uid()::text 
    UNION ALL
    -- 3. Fallback: check staff table (slug-based)
    SELECT s.id 
    FROM public.staff st
    JOIN public.subscribers s ON s.name ILIKE st.subscriber_id
    WHERE st.id = auth.uid() OR st.access_id = auth.uid()::text
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
`;

  // Supabase JS doesn't have a direct way to run arbitrary SQL unless we use RPC
  // Wait, we can't run arbitrary SQL from the client.
  console.log("SQL to run:", sql);
}

run();
