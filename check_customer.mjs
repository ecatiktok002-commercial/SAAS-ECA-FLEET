import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
const envFile = fs.readFileSync('.env', 'utf-8');
let url = '', key = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
});
key = process.env.SUPABASE_SERVICE_ROLE_KEY.replace(/"/g, '');
const supabase = createClient(url, key);

async function run() {
  const { data: c } = await supabase.from('agreements').select('customer_id').eq('reference_number', '270726-ZTA3BJ').single();
  if (c?.customer_id) {
    const { data: cust } = await supabase.from('customers').select('*').eq('id', c.customer_id).single();
    console.log("Customer:", cust);
  }
}
run();
