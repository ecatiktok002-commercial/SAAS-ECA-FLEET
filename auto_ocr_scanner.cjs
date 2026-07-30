require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');

const rawUrl = process.env.VITE_SUPABASE_URL || 'https://czurhanyrjgeicnbrnev.supabase.co';
const supabaseUrl = rawUrl.replace(/^["']|["']$/g, '').trim();

const rawKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dXJoYW55cmpnZWljbmJybmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTExMDEsImV4cCI6MjA4NzQyNzEwMX0.LV4hsQEazpbv8AcLDrEASg8s3uGKmvMJ0FrvMOX6AWQ';
const supabaseKey = rawKey.replace(/^["']|["']$/g, '').trim();

const supabase = createClient(supabaseUrl, supabaseKey);

const rawApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
const apiKey = rawApiKey.replace(/^["']|["']$/g, '').trim();

if (!apiKey) {
  console.error('❌ Missing GEMINI_API_KEY in environment');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runAutoOcrScanner() {
  console.log('🚀 Starting Continuous Background Receipt OCR Scanner for ALL Months...');

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

    if (recError || !rec || !rec.payment_receipt || rec.payment_receipt.length < 50) {
      console.log('⚠️ Payment receipt empty or missing, setting to Cash');
      await supabase.from('agreements').update({ transaction_date: 'Cash' }).eq('id', item.id);
      continue;
    }

    let base64 = rec.payment_receipt;
    let mimeType = 'image/jpeg';
    if (base64.startsWith('data:')) {
      const parts = base64.split(',');
      const match = parts[0].match(/:(.*?);/);
      if (match) mimeType = match[1];
      base64 = parts[1];
    }

    const prompt = `
      Extract the TRANSACTION DATE from this payment receipt image.
      Look closely for any printed, faded, or handwritten dates (e.g. Tarikh, Date, Txn Date, Date/Time).
      If a date is found, return ONLY the date formatted as YYYY-MM-DD (e.g. 2026-06-15).
      If no valid date is found or image is unclear, return ONLY the exact word "Cash".
      Return ONLY YYYY-MM-DD or "Cash".
    `;

    let attempts = 0;
    let done = false;

    while (!done && attempts < 5) {
      try {
        attempts++;
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

        const { error: updateError } = await supabase
          .from('agreements')
          .update({ transaction_date: extractedDate })
          .eq('id', item.id);

        if (updateError) {
          console.error('  ❌ DB Update Error:', updateError.message);
          errorCount++;
        } else {
          console.log(`  ✅ Successfully updated agreement ${item.id}`);
          successCount++;
        }
        done = true;
      } catch (err) {
        console.error(`  ⚠️ OCR Error (Attempt ${attempts}/5):`, err.message);
        if (attempts < 5) {
          console.log('  ⌛ Waiting 15 seconds before retrying...');
          await delay(15000);
        } else {
          console.error('  ❌ Max retries reached for', item.id);
          errorCount++;
        }
      }
    }

    // Standard 3-second delay between successful scans to maintain free quota allowance
    await delay(3000);
  }

  console.log(`\n🎉 All-Month OCR Scan Completed! Processed: ${processedCount} | Success: ${successCount} | Errors: ${errorCount}`);
}

runAutoOcrScanner();
