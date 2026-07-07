const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envRaw = fs.readFileSync('.env', 'utf8');
const envConfig = require('dotenv').parse(envRaw);
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
async function run() {
  const sql = "ALTER TABLE agreements ADD COLUMN IF NOT EXISTS usage TEXT;";
  const { error } = await supabase.rpc('run_sql', { sql_statement: sql });
  if (error) {
    console.log("RPC Error:", error.message, "Trying execute_sql");
    const { error: err2 } = await supabase.rpc('execute_sql', { sql: sql });
    if (err2) {
        console.error("Also failed:", err2);
    } else {
        console.log("Schema updated via execute_sql");
    }
  } else {
    console.log("Schema updated via run_sql");
  }
}
run();
