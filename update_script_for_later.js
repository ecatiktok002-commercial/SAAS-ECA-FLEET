import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL.replace(/^["']|["']$/g, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY).replace(/^["']|["']$/g, '');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function log(msg) {
  console.log(msg);
  fs.appendFileSync('native_scan.log', msg + '\n');
}

async function runBatch() {
  log("Starting safe batch OCR scan for June and July (Descending)...");
  
  const { data: agreements, error } = await supabase.from('agreements')
    .select('id, payment_receipt, created_at, transaction_date')
    .is('transaction_date', null)
    .not('payment_receipt', 'is', null)
    .not('payment_receipt', 'eq', '[]')
    .gte('created_at', '2026-06-01T00:00:00Z')
    .lte('created_at', '2026-07-31T23:59:59Z')
    .order('created_at', { ascending: false });

  if (error) {
    log("Error fetching agreements: " + error.message);
    return;
  }

  log(`Found ${agreements.length} agreements to process.`);

  for (let i = 0; i < agreements.length; i++) {
    const agreement = agreements[i];
    
    if (agreement.transaction_date === ' ') continue;

    log(`\nProcessing ${i+1}/${agreements.length}: Agreement ${agreement.id} (Created: ${agreement.created_at})`);
    
    let receipts = [];
    try {
      receipts = JSON.parse(agreement.payment_receipt);
    } catch(e) {
      log("Invalid payment_receipt format.");
      await supabase.from('agreements').update({ transaction_date: ' ' }).eq('id', agreement.id);
      continue;
    }

    if (!Array.isArray(receipts) || receipts.length === 0) {
      log("No receipt URLs found.");
      await supabase.from('agreements').update({ transaction_date: ' ' }).eq('id', agreement.id);
      continue;
    }

    let detectedDates = [];
    let rateLimited = false;
    
    for (const receiptUrl of receipts) {
      try {
        log(`Scanning receipt: ${receiptUrl}`);
        
        const imageResp = await fetch(receiptUrl);
        const imageBuffer = await imageResp.arrayBuffer();
        const mimeType = imageResp.headers.get("content-type") || 'image/jpeg';
        
        const base64Data = Buffer.from(imageBuffer).toString('base64');
        
        const prompt = `
          Extract the TRANSACTION DATE from this receipt. Return ONLY the date formatted as YYYY-MM-DD. If missing the year, use 2026. If no date, return "Cash".
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [
            { text: prompt },
            { inlineData: { data: base64Data, mimeType } }
          ],
          config: {
            temperature: 0,
          }
        });

        const dateOrCash = response.text?.trim() || "Cash";
        
        if (dateOrCash !== 'Cash') {
            const parsedDate = new Date(dateOrCash.replace(/["']/g, '').trim());
            if (!isNaN(parsedDate.getTime())) {
                detectedDates.push(parsedDate.toISOString().split('T')[0]);
            }
        }
      } catch (err) {
        log("Error scanning receipt: " + err.message);
        if (err.message && err.message.includes('429')) {
            rateLimited = true;
            break;
        }
      }
      
      // Delay to respect 15 RPM free tier
      await sleep(5000); 
    }
    
    if (rateLimited) {
       log("Rate limit hit. Waiting 65s...");
       await sleep(65000);
       i--; // Retry
       continue;
    }

    if (detectedDates.length > 0) {
      const uniqueDates = Array.from(new Set(detectedDates)).filter(Boolean).join(', ');
      await supabase.from('agreements').update({ transaction_date: uniqueDates }).eq('id', agreement.id);
      log("Updated date: " + uniqueDates);
    } else {
      await supabase.from('agreements').update({ transaction_date: ' ' }).eq('id', agreement.id);
      log("No date found. Marked empty.");
    }
  }

  log("Batch scan complete.");
}

// Do not auto-run, just prepare it
runBatch();
