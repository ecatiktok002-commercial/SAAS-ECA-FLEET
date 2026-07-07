const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envConfig = require('dotenv').parse(fs.readFileSync('.env'));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase.from('customers').select('*').limit(1);
    if (data && data.length > 0) {
        console.log("Customer columns:", Object.keys(data[0]));
    } else {
        console.log("No data or error:", error);
    }
}
run();
