const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('agreements')
    .update({ status: 'completed' })
    .eq('status', 'signed');
    
  if (error) {
    console.error("Error updating status:", error);
  } else {
    console.log("Updated previous agreements to completed.");
  }
}
run();
