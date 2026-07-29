import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL.replace(/^["']|["']$/g, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY).replace(/^["']|["']$/g, '');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase.from('agreements')
    .update({ transaction_date: null })
    .eq('transaction_date', ' ');
    
  if (error) console.error(error);
  else console.log(`Restored empty spaces to null`);
}
run();
