
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  // Helper to check various naming conventions
  const getEnvVar = (names: string[]) => {
    for (const name of names) {
      if (env[name]) return env[name];
      if ((process.env as any)[name]) return (process.env as any)[name];
    }
    return undefined; 
  };

  // Resolve Supabase Key: Check specific Supabase keys first.
  // REMOVED generic API_KEY/VITE_API_KEY to avoid conflict with AI service keys.
  // REMOVED service keys to prevent accidental exposure.
  const supabaseKey = getEnvVar([
    'VITE_SUPABASE_ANON_KEY',
    'SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_KEY',
    'SUPABASE_KEY'
  ]);

  // Resolve Supabase URL
  const supabaseUrl = getEnvVar([
    'VITE_SUPABASE_URL',
    'SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL'
  ]);

  // Generic API Key (for other services if needed)
  const apiKey = getEnvVar(['API_KEY', 'VITE_API_KEY']);

  return {
    plugins: [
      react(),
      {
        name: 'dashboard-meter-ocr-api',
        configureServer(server) {
          server.middlewares.use('/api/identify-dashboard', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method Not Allowed' }));
              return;
            }

            let rawBody = '';
            req.on('data', (chunk) => {
              rawBody += chunk;
            });

            req.on('end', async () => {
              try {
                const parsed = JSON.parse(rawBody || '{}');
                const { imageBase64, mimeType = 'image/jpeg' } = parsed;

                if (!imageBase64) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: 'Missing imageBase64 in request body' }));
                  return;
                }

                const geminiKey = process.env.GEMINI_PAID_API_KEY ||
                                  process.env.GEMINI_API_KEY ||
                                  process.env.VITE_GEMINI_API_KEY ||
                                  env.GEMINI_PAID_API_KEY ||
                                  env.GEMINI_API_KEY ||
                                  env.VITE_GEMINI_API_KEY || '';

                if (!geminiKey) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: 'GEMINI_API_KEY not configured on server' }));
                  return;
                }

                let cleanBase64 = imageBase64;
                if (cleanBase64.includes(',')) {
                  cleanBase64 = cleanBase64.split(',')[1];
                }

                const { GoogleGenAI } = await import('@google/genai');
                const ai = new GoogleGenAI({ apiKey: geminiKey });

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

                let modelName = 'gemini-2.5-flash';
                let response;
                try {
                  response = await ai.models.generateContent({
                    model: modelName,
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
                } catch (firstErr: any) {
                  console.warn('Gemini 2.5 flash error, falling back to gemini-2.0-flash:', firstErr.message);
                  response = await ai.models.generateContent({
                    model: 'gemini-2.0-flash',
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

                const responseText = response.text || '{}';
                const result = JSON.parse(responseText);

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  mileage: typeof result.mileage === 'number' ? Math.round(result.mileage) : (result.mileage ? parseInt(String(result.mileage).replace(/\D/g, ''), 10) : null),
                  fuel_level: result.fuel_level || null,
                  confidence: result.confidence ?? 0.9,
                  notes: result.notes || '',
                }));
              } catch (err: any) {
                console.error('Error analyzing dashboard photo:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: err.message || 'Failed to analyze dashboard' }));
              }
            });
          });
        },
      },
    ],
    // Explicitly define process.env variables so they get replaced by actual values during build
    define: {
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseKey || ''),
      'process.env.SUPABASE_URL': JSON.stringify(supabaseUrl || ''),
      'process.env.API_KEY': JSON.stringify(apiKey || ''),
    },
    server: {
      port: 3000,
    },
    build: {
      outDir: 'dist',
    },
    // ADD THIS BLOCK to remove console logs in production
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
  };
});
