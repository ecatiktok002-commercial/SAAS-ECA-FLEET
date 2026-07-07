const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

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
