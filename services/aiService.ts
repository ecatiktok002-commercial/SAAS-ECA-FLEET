/**
 * AI Service for Dashboard Meter Identification (Odometer Mileage & Fuel Level Gauge)
 */

export interface DashboardMeterReading {
  success: boolean;
  mileage: number | null;
  fuelLevel: string | null;
  confidence?: number;
  notes?: string;
  error?: string;
}

/**
 * Converts a File object to a base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Identify Dashboard Meters (Left Bar: Fuel Level, Bottom Part: Integer Mileage)
 * Calls the server-side `/api/identify-dashboard` endpoint powered by Gemini AI,
 * with resilient fallback to direct Gemini client if server returns 404/405/500.
 */
export async function identifyDashboardMeters(
  imageSource: File | string
): Promise<DashboardMeterReading> {
  try {
    let base64String = '';
    let mimeType = 'image/jpeg';

    if (imageSource instanceof File) {
      base64String = await fileToBase64(imageSource);
      mimeType = imageSource.type || 'image/jpeg';
    } else {
      base64String = imageSource;
      if (base64String.startsWith('data:')) {
        const match = base64String.match(/^data:([^;]+);base64,/);
        if (match) {
          mimeType = match[1];
        }
      }
    }

    let cleanBase64 = base64String;
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
    }

    // Attempt 1: Call /api/identify-dashboard endpoint
    let apiSuccess = false;
    let data: any = null;

    try {
      const response = await fetch('/api/identify-dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64String,
          mimeType,
        }),
      });

      if (response.ok) {
        data = await response.json();
        if (data && data.success) {
          apiSuccess = true;
        }
      } else {
        console.warn(`[identifyDashboardMeters] Server route returned ${response.status}. Attempting direct fallback...`);
      }
    } catch (networkErr: any) {
      console.warn('[identifyDashboardMeters] Fetch failed, attempting direct fallback:', networkErr);
    }

    // Attempt 2: Direct Gemini GenAI fallback if server endpoint is unavailable (e.g. static hosting or 405)
    if (!apiSuccess) {
      const clientApiKey = (import.meta as any).env?.VITE_GEMINI_PAID_API_KEY ||
                           (import.meta as any).env?.VITE_GEMINI_API_KEY ||
                           (import.meta as any).env?.GEMINI_PAID_API_KEY ||
                           (import.meta as any).env?.GEMINI_API_KEY || '';

      if (clientApiKey) {
        try {
          const { GoogleGenAI } = await import('@google/genai');
          const ai = new GoogleGenAI({ apiKey: clientApiKey });

          const prompt = `You are an expert vehicle inspection AI specializing in vehicle meter reading.
Carefully examine this car instrument cluster / dashboard photo.

Extract two key readings:
1. FUEL LEVEL (Left Side Bar / Gauge):
- The fuel gauge is commonly a vertical bar / segment display or needle gauge from E (Empty) to F (Full).
- IMPORTANT FUEL BAR SEGMENT COUNTING RULE:
  * In digital instrument clusters (e.g. Perodua Myvi, Bezza, Axia, Ativa, Proton, Toyota, Honda), the fuel gauge consists of an 8-segment scale.
  * The bottom-most bar at "E" (Empty/Reserve) is BAR 1. You MUST include this bottom-most lit segment in your total count! Do NOT ignore or skip the bottom base segment.
  * Count the TOTAL number of lit/filled segments from bottom (E) to top (F):
    - 8 lit segments (reaches 'F' / all bars filled) => "Full Tank"
    - 7 lit segments (only 1 blank bar below 'F') => "7 Bar"
    - 6 lit segments (3/4 tank) => "6 Bar"
    - 5 lit segments (just above half) => "5 Bar"
    - 4 lit segments (exactly half gauge) => "4 Bar"
    - 3 lit segments (just below half) => "3 Bar"
    - 2 lit segments (1/4 tank) => "2 Bar"
    - 1 lit segment (reserve / bottom-most bar only) => "1 Bar"
- If it is an analog needle gauge:
  * Needle at or pointing to 'F' => "Full Tank"
  * 7/8 mark => "7 Bar"
  * 3/4 mark => "6 Bar"
  * 5/8 mark => "5 Bar"
  * 1/2 (Center) mark => "4 Bar"
  * 3/8 mark => "3 Bar"
  * 1/4 mark => "2 Bar"
  * At or near 'E' => "1 Bar"
- Return strictly one of: "1 Bar", "2 Bar", "3 Bar", "4 Bar", "5 Bar", "6 Bar", "7 Bar", "Full Tank".

2. MILEAGE (Bottom Part / Odometer):
- The total odometer is commonly located at the bottom part or digital LCD display of the instrument cluster (marked with "km" or "ODO", e.g., "128450 km" or "45000 km").
- Extract the total odometer mileage as a single integer number.
- Strip any decimal places, "km", "ODO", commas, or trip meters.
- Return ONLY an integer (e.g. 45000, 128450).

Output JSON only in this format:
{
  "mileage": <integer number or null>,
  "fuel_level": <string or null, e.g. "Full Tank", "7 Bar", "6 Bar", "5 Bar", "4 Bar", "3 Bar", "2 Bar", "1 Bar">,
  "confidence": <number from 0.0 to 1.0>,
  "notes": "<short 1-sentence explanation of detected values and bar count from bottom to top>"
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
              },
            });
          } catch (modelErr) {
            response = await ai.models.generateContent({
              model: 'gemini-2.5-pro',
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
              },
            });
          }

          const parsedResult = JSON.parse(response.text || '{}');
          data = {
            success: true,
            mileage: parsedResult.mileage,
            fuel_level: parsedResult.fuel_level,
            confidence: parsedResult.confidence,
            notes: parsedResult.notes,
          };
          apiSuccess = true;
        } catch (directAiErr: any) {
          console.error('[identifyDashboardMeters] Direct Gemini fallback failed:', directAiErr);
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

    // Format fuel level to ensure standard format
    let fuelLevel = data.fuel_level;
    if (fuelLevel) {
      const flLower = String(fuelLevel).toLowerCase();
      if (flLower.includes('full') || flLower.includes('8 bar')) {
        fuelLevel = 'Full Tank';
      } else if (flLower.includes('7 bar')) {
        fuelLevel = '7 Bar';
      } else if (flLower.includes('6 bar')) {
        fuelLevel = '6 Bar';
      } else if (flLower.includes('5 bar')) {
        fuelLevel = '5 Bar';
      } else if (flLower.includes('4 bar') || flLower.includes('half')) {
        fuelLevel = '4 Bar';
      } else if (flLower.includes('3 bar')) {
        fuelLevel = '3 Bar';
      } else if (flLower.includes('2 bar')) {
        fuelLevel = '2 Bar';
      } else if (flLower.includes('1 bar') || flLower.includes('empty')) {
        fuelLevel = '1 Bar';
      }
    }

    return {
      success: true,
      mileage: data.mileage != null ? Math.round(Number(data.mileage)) : null,
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
