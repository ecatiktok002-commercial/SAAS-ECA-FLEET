const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://czurhanyrjgeicnbrnev.supabase.co";
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(/['"]/g, '');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    let { data, error } = await supabase.rpc('get_tables'); 
    // Wait, rpc might not exist. We can query information_schema.
    console.log("To check tables...", data, error);
}
// run();
