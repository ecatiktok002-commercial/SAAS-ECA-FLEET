import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL?.replace(/^["']|["']$/g, '');
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY?.replace(/^["']|["']$/g, '');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log("Fetching agreements...");
  const { data: agreements, error } = await supabase
    .from('agreements')
    .select('id, payment_receipt, transaction_date')
    .not('payment_receipt', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching:", error);
    return;
  }
  
  console.log(`Fetched ${agreements.length} agreements.`);
  const toProcess = agreements.filter(a => {
    if (a.transaction_date && a.transaction_date.trim() !== '') return false;
    try {
      const receipts = JSON.parse(a.payment_receipt);
      return Array.isArray(receipts) && receipts.length > 0;
    } catch {
      return false;
    }
  });
  console.log(`Processing ${toProcess.length} agreements...`);
  
  for (const agreement of toProcess) {
    try {
      const receipts = JSON.parse(agreement.payment_receipt);
      const detectedDates = [];

      for (const url of receipts) {
        console.log(`Processing receipt for agreement ${agreement.id}...`);
        const { data, error: ocrError } = await supabase.functions.invoke('receipt-ocr', {
          body: { receiptUrl: url }
        });

        if (ocrError) {
          console.error(`OCR error for url ${url}:`, ocrError);
          continue;
        }

        if (data && data.result && data.result !== 'Cash') {
          const parsedDate = new Date(data.result);
          if (!isNaN(parsedDate.getTime())) {
            detectedDates.push(parsedDate.toISOString().split('T')[0]);
          }
        }
      }

      if (detectedDates.length > 0) {
        const uniqueDates = Array.from(new Set(detectedDates)).filter(Boolean).join(', ');
        console.log(`Updating agreement ${agreement.id} with transaction_date: ${uniqueDates}`);
        
        await supabase
          .from('agreements')
          .update({ transaction_date: uniqueDates })
          .eq('id', agreement.id);
      }
    } catch (err) {
      console.error(`Error processing agreement ${agreement.id}:`, err);
    }
  }
  console.log("Backfill complete!");
}

run();
