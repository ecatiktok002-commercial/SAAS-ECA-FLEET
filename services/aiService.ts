/**
 * AI Service for Dashboard Meter Identification (Odometer Mileage & Fuel Level Gauge)
 */
import { supabase } from './supabase';

export interface DashboardMeterReading {
  success: boolean;
  mileage: number | null;
  fuelLevel: string | null;
  confidence?: number;
  notes?: string;
  error?: string;
}

/**
 * Compresses and scales an instrument cluster image via HTML5 canvas for fast, reliable mobile OCR.
 * Reduces 10MB+ camera photos to ~200KB while preserving sharp LCD contrast.
 */
export async function prepareMeterImageBase64(
  imageSource: File | string,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.85
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    let resolved = false;
    const safeResolve = (res: { base64: string; mimeType: string }) => {
      if (!resolved) {
        resolved = true;
        resolve(res);
      }
    };

    // Safety timeout: 8 seconds max for image processing
    const timer = setTimeout(() => {
      if (typeof imageSource === 'string') {
        const clean = imageSource.includes(',') ? imageSource.split(',')[1] : imageSource;
        safeResolve({ base64: clean, mimeType: 'image/jpeg' });
      } else {
        safeResolve({ base64: '', mimeType: 'image/jpeg' });
      }
    }, 8000);

    const processDataUrl = (dataUrl: string) => {
      if (!dataUrl || !dataUrl.startsWith('data:')) {
        clearTimeout(timer);
        const clean = dataUrl?.includes(',') ? dataUrl.split(',')[1] : (dataUrl || '');
        safeResolve({ base64: clean, mimeType: 'image/jpeg' });
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const compressedUrl = canvas.toDataURL('image/jpeg', quality);
            const base64Data = compressedUrl.split(',')[1];
            clearTimeout(timer);
            safeResolve({ base64: base64Data, mimeType: 'image/jpeg' });
            return;
          }
        } catch (canvasErr) {
          console.warn('[prepareMeterImageBase64] Canvas compression fallback:', canvasErr);
        }
        clearTimeout(timer);
        const rawBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        safeResolve({ base64: rawBase64, mimeType: 'image/jpeg' });
      };

      img.onerror = () => {
        clearTimeout(timer);
        const rawBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        safeResolve({ base64: rawBase64, mimeType: 'image/jpeg' });
      };

      img.src = dataUrl;
    };

    if (imageSource instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = (e.target?.result as string) || '';
        processDataUrl(result);
      };
      reader.onerror = () => {
        clearTimeout(timer);
        safeResolve({ base64: '', mimeType: 'image/jpeg' });
      };
      reader.readAsDataURL(imageSource);
    } else {
      processDataUrl(imageSource);
    }
  });
}

/**
 * Identify Dashboard Meters (Left Bar: Fuel Level, Bottom Part: Integer Mileage)
 * Uses a resilient 3-tier approach:
 * Tier 1: Local /api/identify-dashboard server endpoint
 * Tier 2: Supabase Edge Function ('receipt-ocr' in dashboard mode)
 * Tier 3: Direct Gemini Client SDK fallback
 */
export async function identifyDashboardMeters(
  imageSource: File | string
): Promise<DashboardMeterReading> {
  try {
    const { base64: cleanBase64, mimeType } = await prepareMeterImageBase64(imageSource);

    if (!cleanBase64) {
      return {
        success: false,
        mileage: null,
        fuelLevel: null,
        error: 'Unable to process image file. Please try another photo.',
      };
    }

    let apiSuccess = false;
    let data: any = null;

    // --- TIER 1: Server endpoint `/api/identify-dashboard` ---
    try {
      const response = await fetch('/api/identify-dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: cleanBase64,
          mimeType,
        }),
      });

      if (response.ok) {
        const resJson = await response.json();
        if (resJson && resJson.success && (resJson.mileage != null || resJson.fuel_level != null)) {
          data = resJson;
          apiSuccess = true;
        } else if (resJson && resJson.success) {
          // Both null, hold data as fallback but allow Tier 2 / Tier 3 to try
          data = resJson;
        }
      }
    } catch (tier1Err) {
      console.warn('[identifyDashboardMeters] Tier 1 server route unreachable, moving to Tier 2:', tier1Err);
    }

    // --- TIER 2: Supabase Edge Function ('receipt-ocr' with mode: 'dashboard') ---
    if (!apiSuccess && supabase) {
      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('receipt-ocr', {
          body: {
            mode: 'dashboard',
            base64Image: cleanBase64,
            mimeType,
          },
        });

        if (!edgeError && edgeData && edgeData.success && (edgeData.mileage != null || edgeData.fuel_level != null)) {
          data = edgeData;
          apiSuccess = true;
        } else if (!edgeError && edgeData && edgeData.success && !data) {
          data = edgeData;
        }
      } catch (tier2Err) {
        console.warn('[identifyDashboardMeters] Tier 2 Supabase edge function unreachable:', tier2Err);
      }
    }

    // --- TIER 3: Direct Gemini SDK Client fallback ---
    if (!apiSuccess) {
      const clientApiKey = (typeof process !== 'undefined' && ((process.env as any)?.GEMINI_PAID_API_KEY || (process.env as any)?.GEMINI_API_KEY || (process.env as any)?.API_KEY || (process.env as any)?.VITE_GEMINI_PAID_API_KEY || (process.env as any)?.VITE_GEMINI_API_KEY || (process.env as any)?.VITE_API_KEY)) ||
                           (import.meta as any).env?.VITE_GEMINI_PAID_API_KEY ||
                           (import.meta as any).env?.VITE_GEMINI_API_KEY ||
                           (import.meta as any).env?.VITE_API_KEY ||
                           (import.meta as any).env?.GEMINI_PAID_API_KEY ||
                           (import.meta as any).env?.GEMINI_API_KEY ||
                           (import.meta as any).env?.API_KEY || '';

      if (clientApiKey) {
        try {
          const { GoogleGenAI } = await import('@google/genai');
          const ai = new GoogleGenAI({ apiKey: clientApiKey });

          const prompt = `You are an expert automobile inspection AI specializing in vehicle instrument clusters, speedometers, odometers, and fuel gauges for Malaysian and Asian car models (e.g. Proton Saga/Persona/Iriz/X50/X70, Perodua Myvi/Bezza/Axia/Alza/Ativa/Aruz, Toyota Vios/Yaris/Innova, Honda City/Civic, Nissan Almera/Serena, etc.).

Analyze this instrument cluster / meter photo carefully. Note that LCD screens may be amber/orange/blue/white backlit or monochrome, and may have glare, reflections, or handwritten markings (e.g. plate initials like JYC, BSN) which should be ignored.

Extract the following two values:

1. FUEL LEVEL:
- For LCD segment bar displays (horizontal or vertical bar blocks between E and F):
  * Horizontal bar (e.g. Proton Saga "E ■■■■ F"): count how many dark/lit segments are filled from 'E' towards 'F'.
  * Vertical bar: count how many blocks are lit from bottom 'E' towards top 'F'.
  * Mapping:
    - 8 bars (all blocks lit / full to 'F') => "Full Tank"
    - 7 bars => "7 Bar"
    - 6 bars (approx 3/4) => "6 Bar"
    - 5 bars => "5 Bar"
    - 4 bars (halfway) => "4 Bar"
    - 3 bars => "3 Bar"
    - 2 bars (approx 1/4) => "2 Bar"
    - 1 bar (near 'E') => "1 Bar"
- For analog needle gauges:
  * Needle at 'F' => "Full Tank"
  * Needle at 3/4 => "6 Bar"
  * Needle at 1/2 (Half) => "4 Bar"
  * Needle at 1/4 => "2 Bar"
  * Needle at 'E' (Empty / Reserve) => "1 Bar"
- Choose strictly one of: ["1 Bar", "2 Bar", "3 Bar", "4 Bar", "5 Bar", "6 Bar", "7 Bar", "Full Tank"].

2. ODOMETER MILEAGE (KM):
- Find the cumulative odometer total mileage reading (e.g. "114006", "15028", "45200", "78912", "15952").
- Look for the integer digits labeled with "ODO", "TOTAL", or next to "km".
- Disregard trip meters (e.g. TRIP A, TRIP B), clock time (e.g. "5:40"), speed (e.g. "0 km/h"), gear position (e.g. "P", "D"), and outside temperature (e.g. "32°C").
- Extract ONLY the integer odometer number (e.g. 114006).

Output strictly valid JSON with no markdown formatting or markdown code blocks:
{
  "mileage": <integer number or null>,
  "fuel_level": <"Full Tank" | "7 Bar" | "6 Bar" | "5 Bar" | "4 Bar" | "3 Bar" | "2 Bar" | "1 Bar" | null>,
  "confidence": <number 0.0 to 1.0>,
  "notes": "<brief description of what was seen on the meter>"
}`;

          let response;
          try {
            response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: [
                {
                  inlineData: {
                    data: cleanBase64,
                    mimeType: mimeType,
                  },
                },
                prompt,
              ],
              config: {
                responseMimeType: 'application/json',
                temperature: 0,
              },
            });
          } catch (modelErr) {
            console.error('[/api/identify-dashboard] Gemini 2.5 flash error:', modelErr);
            throw modelErr;
          }

          const cleanText = (response.text || '{}').replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsedResult = JSON.parse(cleanText);
          data = {
            success: true,
            mileage: parsedResult.mileage,
            fuel_level: parsedResult.fuel_level,
            confidence: parsedResult.confidence,
            notes: parsedResult.notes,
          };
          apiSuccess = true;
        } catch (directAiErr: any) {
          console.error('[identifyDashboardMeters] Tier 3 direct Gemini fallback failed:', directAiErr);
        }
      }
    }

    if (!apiSuccess || !data || !data.success) {
      return {
        success: false,
        mileage: null,
        fuelLevel: null,
        error: (data && data.error) ? data.error : 'AI could not read the meters clearly. Please input values manually.',
      };
    }

    // Format fuel level to ensure standard format compatible with dropdown
    let fuelLevel = data.fuel_level;
    if (fuelLevel) {
      const flLower = String(fuelLevel).toLowerCase().trim();
      if (flLower.includes('full') || flLower.includes('8') || flLower === 'f' || flLower.includes('100%')) {
        fuelLevel = 'Full Tank';
      } else if (flLower.includes('7')) {
        fuelLevel = '7 Bar';
      } else if (flLower.includes('6') || flLower.includes('3/4') || flLower.includes('75%')) {
        fuelLevel = '6 Bar';
      } else if (flLower.includes('5')) {
        fuelLevel = '5 Bar';
      } else if (flLower.includes('4') || flLower.includes('half') || flLower.includes('1/2') || flLower.includes('50%')) {
        fuelLevel = '4 Bar';
      } else if (flLower.includes('3') || flLower.includes('3/8')) {
        fuelLevel = '3 Bar';
      } else if (flLower.includes('2') || flLower.includes('1/4') || flLower.includes('25%')) {
        fuelLevel = '2 Bar';
      } else if (flLower.includes('1') || flLower.includes('low') || flLower.includes('empty') || flLower.includes('reserve') || flLower === 'e') {
        fuelLevel = '1 Bar';
      }
    }

    let mileageNum: number | null = null;
    if (data.mileage != null) {
      if (typeof data.mileage === 'number') {
        mileageNum = Math.round(data.mileage);
      } else {
        const cleanStr = String(data.mileage).replace(/,/g, '').replace(/km/gi, '').replace(/odo/gi, '').trim();
        const match = cleanStr.match(/\d+/);
        if (match) {
          const parsed = parseInt(match[0], 10);
          mileageNum = isNaN(parsed) ? null : parsed;
        }
      }
    }

    return {
      success: true,
      mileage: mileageNum,
      fuelLevel: fuelLevel || null,
      confidence: data.confidence,
      notes: data.notes,
    };
  } catch (err: any) {
    console.error('identifyDashboardMeters error:', err);
    return {
      success: false,
      mileage: null,
      fuelLevel: null,
      error: 'AI meter scan could not read photo. Please input manually.',
    };
  }
}
