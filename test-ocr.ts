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
      You are an expert OCR and data extraction system.
      Extract the transaction date from this payment receipt.
      If a date is found, return ONLY the date in YYYY-MM-DD format.
      If no valid transaction date can be found on this receipt, return ONLY the word "Cash".
      Do not include any other text, markdown formatting, or explanation.
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
