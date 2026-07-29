import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf-8');
let url = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
});
const key = process.env.SUPABASE_SERVICE_ROLE_KEY.replace(/"/g, '');
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('agreements')
    .select('id, payment_receipt, signature_data, status, booking_id, reference_number')
    .or('payment_receipt.is.null,payment_receipt.eq."[]",payment_receipt.eq."null"')
    .eq('status', 'completed');
  
  if (data) {
    for (const a of data) {
      const newStatus = (a.signature_data && a.signature_data !== 'null' && a.signature_data !== '[]') ? 'signed' : 'pending';
      const { error: updErr, data: updData } = await supabase.from('agreements')
        .update({ status: newStatus }).eq('id', a.id).select();
      console.log('Fixed', a.reference_number, newStatus, updData?.length > 0 ? "Success" : updErr);
    }
  } else {
    console.log("No data or error:", error);
  }
}
run();
