import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function check() {
  const { data, error } = await supabase.rpc('exec_sql', { sql: `
    DROP POLICY IF EXISTS "Public read handover records" ON handover_records;
    CREATE POLICY "Public read handover records" ON handover_records
      FOR SELECT USING (true);
  `});
  console.log("Result:", data, error);
}
check();
