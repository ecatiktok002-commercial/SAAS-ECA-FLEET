import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "https://esm.sh/@google/genai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// =========================================================================
// IN-MEMORY SLIDING WINDOW RATE LIMITER (Layer 1: High-Throughput Burst Shield)
// =========================================================================
const BURST_LIMIT_PER_MINUTE = 30; // Max 30 requests per minute per subscriber
const WINDOW_MS = 60 * 1000;       // 1 minute window

interface RateBucket {
  count: number;
  resetAt: number;
}

const memoryRateMap = new Map<string, RateBucket>();

function checkBurstRateLimit(key: string): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  let bucket = memoryRateMap.get(key);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 1, resetAt: now + WINDOW_MS };
    memoryRateMap.set(key, bucket);
    return {
      allowed: true,
      remaining: BURST_LIMIT_PER_MINUTE - 1,
      resetInSeconds: Math.ceil(WINDOW_MS / 1000),
    };
  }

  if (bucket.count >= BURST_LIMIT_PER_MINUTE) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count++;
  return {
    allowed: true,
    remaining: BURST_LIMIT_PER_MINUTE - bucket.count,
    resetInSeconds: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 🔐 --- STEP 1: USER AUTHORIZATION GATE --- 🔐
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('VITE_SUPABASE_ANON_KEY') || '';
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || supabaseAnonKey;

    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    // Validate the JWT Token with Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or expired access token" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve Subscriber ID (from user metadata or fallback to user ID)
    const subscriberId = user.user_metadata?.subscriber_id || user.id;

    // 🛡️ --- STEP 2: RATE-LIMITING (BURST PROTECTION) --- 🛡️
    const rateCheck = checkBurstRateLimit(subscriberId);
    const rateLimitHeaders = {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': String(BURST_LIMIT_PER_MINUTE),
      'X-RateLimit-Remaining': String(rateCheck.remaining),
      'X-RateLimit-Reset': String(rateCheck.resetInSeconds),
    };

    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ 
          error: `Rate limit exceeded. Maximum ${BURST_LIMIT_PER_MINUTE} requests/min allowed per subscriber. Please retry in ${rateCheck.resetInSeconds} seconds.`,
          retryAfter: rateCheck.resetInSeconds
        }),
        { status: 429, headers: { ...rateLimitHeaders, 'Retry-After': String(rateCheck.resetInSeconds) } }
      );
    }

    // 📥 --- STEP 3: PAYLOAD VALIDATION --- 📥
    const { receiptUrl, base64Image, mimeType } = await req.json();

    if (!receiptUrl && !base64Image) {
      throw new Error("Missing receiptUrl or base64Image");
    }

    // 🤖 --- STEP 4: GEMINI GENAI OCR PROCESSING --- 🤖
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
      const imageResp = await fetch(receiptUrl);
      const imageBuffer = await imageResp.arrayBuffer();
      const base64Data = arrayBufferToBase64(imageBuffer);
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
      model: 'gemini-2.5-flash',
      contents: [prompt, imagePart],
      config: {
        temperature: 0,
      }
    });

    const dateOrCash = response.text?.trim() || "Cash";

    return new Response(
      JSON.stringify({ 
        result: dateOrCash,
        subscriberId: subscriberId,
        remainingQuota: rateCheck.remaining
      }),
      { headers: rateLimitHeaders, status: 200 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error during OCR processing" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
