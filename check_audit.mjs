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
  const { data: v, error } = await supabase.from('subscriber_audit_view').select('reference_number, status, payment_receipt').eq('reference_number', '270726-ZTA3BJ');
  console.log("View:", v, error);
}
run();
