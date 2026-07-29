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
      You are an expert OCR and data extraction system analyzing a payment receipt.
      Your goal is to extract the transaction date from this receipt.
      Look closely for any printed, faded, or handwritten dates. It might be labeled as "Date", "Tarikh", "Txn Date", or simply be a date format like DD/MM/YYYY, MM/DD/YY, etc.
      
      If a date is found, return ONLY the date formatted exactly in YYYY-MM-DD format.
      If no valid transaction date can be found anywhere on this receipt, return ONLY the word "Cash".
      Do not include any other text, markdown formatting, or explanation.
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