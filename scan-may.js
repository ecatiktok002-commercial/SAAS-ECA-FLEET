import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL.replace(/^["']|["']$/g, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY).replace(/^["']|["']$/g, '');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function log(msg) {
  console.log(msg);
  fs.appendFileSync('scan-june-july.log', msg + '\n');
}

async function runBatch() {
  log("Starting batch OCR scan for May (Descending)...");
  
  const { data: agreements, error } = await supabase.from('agreements')
    .select('id, payment_receipt, created_at, transaction_date')
    .is('transaction_date', null)
    .not('payment_receipt', 'is', null)
    .not('payment_receipt', 'eq', '[]')
    .gte('created_at', '2026-05-01T00:00:00Z')
    .lt('created_at', '2026-06-01T00:00:00Z')
    .order('created_at', { ascending: false });

  if (error) {
    log("Error fetching agreements: " + error.message);
    return;
  }

  log(`Found ${agreements.length} agreements in May to process.`);

  for (let i = 0; i < agreements.length; i++) {
    const agreement = agreements[i];
    
    // Skip empty marker
    if (agreement.transaction_date === ' ') continue;

    log(`\nProcessing ${i+1}/${agreements.length}: Agreement ${agreement.id} (Created: ${agreement.created_at})`);
    
    let receipts = [];
    try {
      receipts = JSON.parse(agreement.payment_receipt);
    } catch(e) {
      log("Invalid payment_receipt format: " + agreement.payment_receipt);
      continue;
    }

    if (!Array.isArray(receipts) || receipts.length === 0) {
      log("No receipt URLs found.");
      continue;
    }

    let detectedDates = [];
    let rateLimited = false;

    for (const receiptUrl of receipts) {
      log("Scanning receipt: " + receiptUrl);
      try {
        const res = await fetch(SUPABASE_URL + '/functions/v1/receipt-ocr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + SUPABASE_KEY
            },
            body: JSON.stringify({ receiptUrl })
        });
        
        if (res.status === 429) {
           rateLimited = true;
           break;
        }

        const text = await res.text();
        try {
            const data = JSON.parse(text);
            if (data.error) {
                if (typeof data.error === 'string' && data.error.includes('429')) {
                   rateLimited = true;
                   break;
                }
                log("Function returned error: " + JSON.stringify(data.error));
            } else if (data.result && data.result !== 'Cash') {
                const cleanResult = data.result.replace(/["']/g, '').trim();
                const parsedDate = new Date(cleanResult);
                if (!isNaN(parsedDate.getTime())) {
                    detectedDates.push(parsedDate.toISOString().split('T')[0]);
                    log("Detected Date: " + detectedDates[detectedDates.length-1]);
                }
            } else if (data.result === 'Cash') {
                log("Result was Cash");
            }
        } catch(e) {
             log("Failed to parse response JSON: " + text);
        }
      } catch (err) {
        log("Fetch error: " + err.message);
      }
      
      // Delay between individual receipts to stay well below 15 RPM (4 seconds)
      await sleep(6500); 
    }

    if (rateLimited) {
       log("Waiting 65 seconds due to rate limit...");
       await sleep(65000);
       i--; // Retry this agreement
       continue;
    }

    if (detectedDates.length > 0) {
      const uniqueDates = Array.from(new Set(detectedDates)).filter(Boolean).join(', ');
      log("Updating database with transaction_date: " + uniqueDates);
      const { error: updateError } = await supabase.from('agreements')
        .update({ transaction_date: uniqueDates })
        .eq('id', agreement.id);
      
      if (updateError) {
         log("Update error: " + updateError.message);
      } else {
         log("Update successful.");
      }
    } else {
      log("No valid dates detected for this agreement. Updating with empty space to skip next time.");
      await supabase.from('agreements')
        .update({ transaction_date: ' ' })
        .eq('id', agreement.id);
    }
  }

  log("May Batch scan complete.");
}

runBatch();
