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
  const tables = ['bookings', 'agreements', 'handover_records', 'customers', 'subscriber_audit_view'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(500);
    if (data) {
      const match = data.find(r => JSON.stringify(r).includes('270726-ZTA3BJ'));
      if (match) console.log(`Found in ${t}:`, match.id || match.reference_number);
    }
  }
}
run();
