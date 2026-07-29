const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envConfig = require('dotenv').parse(fs.readFileSync('.env'));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Invoking receipt-ocr...");
    const { data, error } = await supabase.functions.invoke('receipt-ocr', {
        body: {
            receiptUrl: "https://example.com/receipt.jpg"
        }
    });
    console.log("Data:", data);
    console.log("Error:", error);
}
run();
