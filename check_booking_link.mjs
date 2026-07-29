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
  const { data: agr } = await supabase.from('agreements').select('booking_id').eq('reference_number', '270726-ZTA3BJ').single();
  console.log("Linked booking_id:", agr?.booking_id);
  if (agr?.booking_id) {
    const { data: bkg } = await supabase.from('bookings').select('id, status').eq('id', agr.booking_id).single();
    console.log("Booking status:", bkg?.status);
  }
}
run();
