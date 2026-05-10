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
  const { data: viewData, error: vErr } = await supabase
    .from('subscriber_audit_view')
    .select('*')
    .ilike('customer_name', '%MUHAMMAD HADI LUQMAN%');
    
  if (vErr) {
    console.error(vErr);
  } else {
    console.log("VIEW DATA:", JSON.stringify(viewData, null, 2));
  }
}

run();
