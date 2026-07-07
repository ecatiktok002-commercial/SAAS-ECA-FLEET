const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envConfig = require('dotenv').parse(fs.readFileSync('.env'));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase.from('agreements_light').select('id').limit(1);
    if (error) {
        console.error("Error with agreements_light:", error.message);
    } else {
        console.log("agreements_light is working.");
    }
}
run();
