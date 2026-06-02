import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
let url = '';
let key = '';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      if (match[1] === 'VITE_SUPABASE_URL') url = match[2];
      if (match[1] === 'VITE_SUPABASE_ANON_KEY') key = match[2];
    }
  });
}

const supabase = createClient(url, key);

async function run() {
  const { data: aData, error: aErr } = await supabase
    .from('agreements')
    .select('*, bookings(*, cars(*))')
    .ilike('customer_name', '%MOHD ZAINURY%');
    
  if (aErr) {
    console.error('ERROR', aErr);
  } else {
    console.log("AGREEMENTS:", JSON.stringify(aData, null, 2));
  }
}

run();
