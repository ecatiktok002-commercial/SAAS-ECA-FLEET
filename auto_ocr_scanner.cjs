require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');

const rawUrl = process.env.VITE_SUPABASE_URL || 'https://czurhanyrjgeicnbrnev.supabase.co';
const supabaseUrl = rawUrl.replace(/^["']|["']$/g, '').trim();

// Use SUPABASE_SERVICE_ROLE_KEY to bypass RLS for background database updates
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dXJoYW55cmpnZWljbmJybmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTExMDEsImV4cCI6MjA4NzQyNzEwMX0.LV4hsQEazpbv8AcLDrEASg8s3uGKmvMJ0FrvMOX6AWQ';
const supabaseKey = rawKey.replace(/^["']|["']$/g, '').trim();

const supabase = createClient(supabaseUrl, supabaseKey);

// Prioritize GEMINI_PAID_API_KEY
const rawApiKey = process.env.GEMINI_PAID_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
const apiKey = rawApiKey.replace(/^["']|["']$/g, '').trim();

if (!apiKey) {
  console.error('❌ Missing GEMINI_API_KEY in environment');
  process.exit(1);
}

console.log('🔑 Initializing OCR Scanner with Service Role Key and Paid Gemini API Key');

const ai = new GoogleGenAI({ apiKey });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function extractImageString(raw) {
  if (!raw) return null;
  let str = raw.trim();
  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed) && parsed.length > 0) {
        str = parsed[0];
      }
    } catch (e) {
      str = str.replace(/^\["|"]$/g, '').replace(/^\['|']$/g, '');
    }
  }
  str = str.replace(/^["']|["']$/g, '').trim();
  return str;
}

async function runAutoOcrScanner() {
  console.log('🚀 Starting Robust Service Role Background Receipt OCR Scanner...');

  // Query all agreements missing transaction_date
  const { data: idList, error: listError } = await supabase
    .from('agreements')
    .select('id, created_at, reference_number')
    .or('transaction_date.is.null,transaction_date.eq.')
    .not('payment_receipt', 'is', null)
    .order('created_at', { ascending: false });

  if (listError) {
    console.error('❌ Error fetching agreement list:', listError.message);
    return;
  }

  console.log(`📊 Found ${idList.length} total agreements pending OCR scan across all months.`);

  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;

  for (const item of idList) {
    processedCount++;
    console.log(`\n[${processedCount}/${idList.length}] Processing ID: ${item.id} | Ref: ${item.reference_number || 'N/A'} | Date: ${item.created_at?.slice(0, 10)}`);

    const { data: rec, error: recError } = await supabase
      .from('agreements')
      .select('id, payment_receipt')
      .eq('id', item.id)
      .single();

    if (recError || !rec || !rec.payment_receipt || rec.payment_receipt.length < 20) {
      console.log('⚠️ Payment receipt empty or missing, setting to Cash');
      await supabase.from('agreements').update({ transaction_date: 'Cash' }).eq('id', item.id);
      continue;
    }

    const cleanImgStr = extractImageString(rec.payment_receipt);
    if (!cleanImgStr || cleanImgStr.length < 20) {
      console.log('⚠️ Payment receipt unparseable, setting to Cash');
      await supabase.from('agreements').update({ transaction_date: 'Cash' }).eq('id', item.id);
      continue;
    }

    let base64 = cleanImgStr;
    let mimeType = 'image/jpeg';
    if (base64.startsWith('data:')) {
      const parts = base64.split(',');
      const match = parts[0].match(/:(.*?);/);
      if (match) mimeType = match[1];
      base64 = parts[1];
    } else if (base64.startsWith('http://') || base64.startsWith('https://')) {
      try {
        const resp = await fetch(base64);
        const buf = await resp.arrayBuffer();
        base64 = Buffer.from(buf).toString('base64');
        mimeType = resp.headers.get('content-type') || 'image/jpeg';
      } catch (e) {
        console.error('  ❌ Failed to fetch image URL:', e.message);
        await supabase.from('agreements').update({ transaction_date: 'Cash' }).eq('id', item.id);
        continue;
      }
    }

    const prompt = `
      You are an expert OCR and data extraction system analyzing a payment receipt.
      Your goal is to extract the TRANSACTION DATE from this receipt.
      Look closely for any printed, faded, or handwritten dates (e.g., Tarikh, Date, Txn Date, Date/Time).
      If a date is found, return ONLY the date formatted as YYYY-MM-DD (e.g. 2026-06-15).
      If no valid date is found or receipt is unclear/cash, return ONLY the exact word "Cash".
      Return ONLY YYYY-MM-DD or "Cash".
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          prompt,
          {
            inlineData: {
              data: base64,
              mimeType: mimeType,
            },
          },
        ],
        config: { temperature: 0 },
      });

      const extractedDate = response.text?.trim() || 'Cash';
      console.log(`  ➔ OCR Result: "${extractedDate}"`);

      const { data: updateRes, error: updateError } = await supabase
        .from('agreements')
        .update({ transaction_date: extractedDate })
        .eq('id', item.id)
        .select('id, transaction_date');

      if (updateError || !updateRes || updateRes.length === 0) {
        console.error('  ❌ DB Update Error or 0 rows updated:', updateError ? updateError.message : '0 rows updated');
        errorCount++;
      } else {
        console.log(`  ✅ Successfully updated agreement ${item.id} to transaction_date: "${updateRes[0].transaction_date}"`);
        successCount++;
      }
    } catch (err) {
      console.error('  ❌ Gemini OCR Error:', err.message);
      errorCount++;

      if (err.message.includes('429') || err.message.includes('Quota')) {
        console.log('  ⌛ Rate limit hit. Pausing 10 seconds...');
        await delay(10000);
      }
    }

    // Smooth 1-second pause
    await delay(1000);
  }

  console.log(`\n🎉 All-Month OCR Scan Completed! Processed: ${processedCount} | Success: ${successCount} | Errors: ${errorCount}`);
}

runAutoOcrScanner();
