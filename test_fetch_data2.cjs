const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  try {
    const { data: statsData, error: err2 } = await supabase
        .from('saas_revenue_dashboard')
        .select('*');
        
    console.log("statsData", JSON.stringify(statsData, null, 2));
    
  } catch (err) {
    console.error("Caught error:", err);
  }
}
test();
