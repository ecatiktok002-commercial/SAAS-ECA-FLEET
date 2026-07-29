import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL.replace(/^["']|["']$/g, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY).replace(/^["']|["']$/g, '');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { count, error } = await supabase.from('agreements')
    .select('*', { count: 'exact', head: true })
    .is('transaction_date', null)
    .not('payment_receipt', 'is', null)
    .not('payment_receipt', 'eq', '[]')
    .gte('created_at', '2026-06-01T00:00:00Z')
    .lte('created_at', '2026-07-31T23:59:59Z');
    
  if (error) console.error(error);
  else console.log(`Remaining agreements to process: ${count}`);
}
run();
