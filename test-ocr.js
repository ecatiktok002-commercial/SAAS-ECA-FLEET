import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();
async function run() {
    const receiptUrl = "https://picsum.photos/200/300"; // dummy
    const baseUrl = process.env.VITE_SUPABASE_URL.replace(/^["']|["']$/g, '');
    const res = await fetch(baseUrl + '/functions/v1/receipt-ocr', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + process.env.VITE_SUPABASE_ANON_KEY.replace(/^["']|["']$/g, '')
        },
        body: JSON.stringify({ receiptUrl })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
}
run();
