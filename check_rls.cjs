const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://czurhanyrjgeicnbrnev.supabase.co";
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(/['"]/g, '');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    let { data, error } = await supabase.from('subscriber_payments').select('*').limit(1);
    console.log("subscriber_payments:", data, error);
}
run();
