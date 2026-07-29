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
  log("Starting native batch OCR scan for June and July (Descending)...");
  
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
    
    for (const receiptUrl of receipts) {
      try {
        log(`Scanning receipt: ${receiptUrl}`);
        
        const imageResp = await fetch(receiptUrl);
        const imageBuffer = await imageResp.arrayBuffer();
        const mimeType = imageResp.headers.get("content-type") || 'image/jpeg';
        
        // Use base64 buffer for @google/genai
        const base64Data = Buffer.from(imageBuffer).toString('base64');
        
        const prompt = `
          You are an expert OCR and data extraction system analyzing a payment receipt (often from Malaysian banks like Maybank, CIMB, RHB, TnG eWallet, DuitNow, or cash receipts).
          Your goal is to extract the TRANSACTION DATE from this receipt.

          Look closely for any printed, faded, or handwritten dates. 
          It might be labeled as "Date", "Tarikh", "Txn Date", "Date/Time", or have no label at all.
          It could appear in various formats, such as:
          - DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
          - MM/DD/YYYY
          - DD MMM YYYY (e.g., 25 Jul 2026, 25-Jul-2026)
          - XX:XX:XXXX (sometimes OCR misreads separators, e.g. 29:07:2026)
          - YYYY-MM-DD
          - If time is included (e.g., 25/07/2026 14:30), extract just the date.
          
          CRITICAL INSTRUCTIONS:
          1. If a date is found, you MUST return ONLY the date formatted EXACTLY as YYYY-MM-DD (e.g., 2026-07-29).
          2. If you see a date but the year is missing (e.g., 25 Jul), assume the current year (2026).
          3. If there are multiple dates (like print date vs transaction date), choose the transaction date.
          4. If no valid transaction date can be found anywhere on this receipt, return ONLY the exact word "Cash".
          5. DO NOT include any other text, markdown formatting, JSON, or explanation. ONLY the YYYY-MM-DD string or "Cash".
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
      }
      
      // Delay 2s to be gentle
      await sleep(2000); 
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

runBatch();
