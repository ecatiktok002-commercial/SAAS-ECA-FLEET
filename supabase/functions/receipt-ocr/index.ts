import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "https://esm.sh/@google/genai";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { receiptUrl, base64Image, mimeType } = await req.json();

    if (!receiptUrl && !base64Image) {
      throw new Error("Missing receiptUrl or base64Image");
    }

    const ai = new GoogleGenAI({ apiKey: Deno.env.get("GEMINI_API_KEY") });

    let imagePart: any = {};
    if (base64Image) {
       imagePart = {
          inlineData: {
             data: base64Image,
             mimeType: mimeType || 'image/jpeg'
          }
       };
    } else {
       // Fetch the image from URL
       const imageResp = await fetch(receiptUrl);
       const imageBuffer = await imageResp.arrayBuffer();
       const base64Data = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
       const contentType = imageResp.headers.get("content-type") || 'image/jpeg';
       
       imagePart = {
          inlineData: {
             data: base64Data,
             mimeType: contentType
          }
       };
    }

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
      contents: [prompt, imagePart],
      config: {
        temperature: 0,
      }
    });

    const dateOrCash = response.text?.trim() || "Cash";

    return new Response(
      JSON.stringify({ result: dateOrCash }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
