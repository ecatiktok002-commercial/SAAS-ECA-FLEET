const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  try {
    const { data: subsData, error: err1 } = await supabase
        .from('subscribers')
        .select('id, name, brand_name, tier, is_active, status, is_trial, expiry_date, created_at, address')
        .order('name', { ascending: true });
        
    if (err1) throw err1;
    
    console.log("subsData", subsData.length);
    
    const { data: statsData, error: err2 } = await supabase
        .from('saas_revenue_dashboard')
        .select('*');
        
    console.log("statsData", statsData ? statsData.length : err2);
    
  } catch (err) {
    console.error("Caught error:", err);
  }
}
test();
