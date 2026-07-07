const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let envStr = fs.readFileSync('.env', 'utf8');
let url = envStr.match(/VITE_SUPABASE_URL=(.+)/)[1];
let key = envStr.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1];

const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('agreements_light').select('id, subscriber_id').limit(1);
  if (error) {
    console.log('agreements_light error:', error.message);
  } else {
    console.log('agreements_light ok');
  }

  const { data: d2, error: e2 } = await supabase.from('customer_crm_view').select('id').limit(1);
  if (e2) {
    console.log('customer_crm_view error:', e2.message);
  } else {
    console.log('customer_crm_view ok');
  }
}
test();
