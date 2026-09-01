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

          const prompt = `You are an expert vehicle inspection AI specializing in reading automobile instrument clusters, speedometers, odometers, and fuel gauges.
Carefully inspect this vehicle meter / dashboard photo. Note that the photo might have ambient reflections, amber/orange/monochrome LCD backlights, or handwritten markings (e.g. car plate initials like JYC written in chalk or digital markup) which you should ignore.

Extract these two values:

1. FUEL LEVEL (Left Vertical Bar Gauge or Analog Needle):
- For digital LCD clusters (e.g. Proton Saga/Persona, Perodua Myvi/Bezza/Axia, Toyota, Honda):
  * Look for the vertical fuel level bar gauge on the left side between 'E' (bottom) and 'F' (top).
  * Count the total number of illuminated / dark lit bar blocks starting from the bottom 'E' bar:
    - 8 bars (up to 'F') => "Full Tank"
    - 7 bars => "7 Bar"
    - 6 bars (3/4) => "6 Bar"
    - 5 bars => "5 Bar"
    - 4 bars (half) => "4 Bar"
    - 3 bars => "3 Bar"
    - 2 bars (1/4) => "2 Bar"
    - 1 bar (near 'E') => "1 Bar"
- For analog needle gauges:
  * Needle at 'F' => "Full Tank"
  * Needle at 3/4 => "6 Bar"
  * Needle at 1/2 => "4 Bar"
  * Needle at 1/4 => "2 Bar"
  * Needle at 'E' => "1 Bar"
- Choose strictly the closest value: "1 Bar", "2 Bar", "3 Bar", "4 Bar", "5 Bar", "6 Bar", "7 Bar", "Full Tank".

2. ODOMETER MILEAGE (KM):
- Look for the digital number next to "ODO", "km", or the main odometer display (e.g. "15952 km", "45200").
- Disregard the clock (e.g. "3:23") and gear indicator (e.g. "P", "D").
- Extract ONLY the integer odometer reading (e.g. 15952).

Output strictly valid JSON:
{
  "mileage": <integer number or null>,
  "fuel_level": <"Full Tank" | "7 Bar" | "6 Bar" | "5 Bar" | "4 Bar" | "3 Bar" | "2 Bar" | "1 Bar" | null>,
  "confidence": <number 0.0 to 1.0>,
  "notes": "<short explanation>"
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
