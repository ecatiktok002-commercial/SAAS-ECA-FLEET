import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

// To run: GEMINI_API_KEY=your_key node --experimental-strip-types test-ocr.ts <path-to-image-or-url>

async function run() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Please provide an image file path or URL");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  let inlineData: any;
  if (arg.startsWith('http')) {
    const resp = await fetch(arg);
    const buffer = await resp.arrayBuffer();
    inlineData = {
      data: Buffer.from(buffer).toString('base64'),
      mimeType: resp.headers.get('content-type') || 'image/jpeg'
    };
  } else {
    const buffer = fs.readFileSync(arg);
    inlineData = {
      data: buffer.toString('base64'),
      mimeType: 'image/jpeg'
    };
  }

  const prompt = `
      You are an expert OCR and data extraction system analyzing a payment receipt (often from Malaysian banks like Maybank, CIMB, RHB, TnG eWallet, or cash receipts).
      Your goal is to extract the TRANSACTION DATE from this receipt.
      Look closely for any printed, faded, or handwritten dates. 
      It might be labeled as "Date", "Tarikh", "Txn Date", "Date/Time", or have no label at all.
      It could appear in various formats, such as:
      - DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
      - MM/DD/YYYY
      - DD MMM YYYY (e.g., 25 Jul 2026, 25-Jul-2026)
      - XX:XX:XXXX (sometimes OCR misreads separators)
      - YYYY-MM-DD
      - If time is included (e.g., 25/07/2026 14:30), extract just the date.
      
      CRITICAL INSTRUCTIONS:
      1. If a date is found, you MUST return ONLY the date formatted EXACTLY as YYYY-MM-DD.
      2. If you see a date but the year is missing (e.g., 25 Jul), assume the current year.
      3. If no valid transaction date can be found anywhere on this receipt, return ONLY the exact word "Cash".
      4. DO NOT include any other text, markdown formatting, or explanation. ONLY the YYYY-MM-DD string or "Cash".
  `;

  console.log("Analyzing image...");
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [prompt, { inlineData }],
    config: { temperature: 0 }
  });

  console.log("Result:", response.text?.trim());
}

run().catch(console.error);
