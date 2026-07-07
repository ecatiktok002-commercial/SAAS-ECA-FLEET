const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envConfig = require('dotenv').parse(fs.readFileSync('.env'));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        const { data, error } = await supabase.from('agreements_light').select('id').limit(1);
        console.log("agreements_light:", error ? error.message : "Exists");
        
        const { data: d2, error: e2 } = await supabase.from('agreements').select('id').limit(1);
        console.log("agreements:", e2 ? e2.message : "Exists");
    } catch(err) {
        console.log("Error:", err);
    }
}
run();
