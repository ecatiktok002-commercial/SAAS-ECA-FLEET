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
  const { data, error } = await supabase.rpc('get_public_handover_details', { p_booking_id: '270726-ZTA3BJ', p_type: 'Pickup' });
  console.log(data, error);
}
run();
