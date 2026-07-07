const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('subscribers')
    .select('id, name, brand_name, tier, is_active, status, is_trial, expiry_date, created_at, address')
    .order('name', { ascending: true });
    
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success:", data.length);
  }
}
test();
