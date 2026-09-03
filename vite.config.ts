
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
  const apiKey = getEnvVar(['API_KEY', 'VITE_API_KEY', 'GEMINI_API_KEY', 'GEMINI_PAID_API_KEY']);

  function createDashboardOcrMiddleware(loadedEnv: Record<string, string>) {
    return async (req: any, res: any, next: any) => {
      const rawUrl = req.originalUrl || req.url || '';
      const pathName = rawUrl.split('?')[0];

      if (pathName !== '/api/identify-dashboard' && pathName !== '/api/identify-dashboard/') {
        return next();
      }

      // Handle CORS / preflight
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
      }

      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }));
        return;
      }

      const chunks: Buffer[] = [];
      req.on('data', (chunk: any) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      req.on('end', async () => {
        try {
          const rawBody = Buffer.concat(chunks).toString('utf-8');
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
                            process.env.API_KEY ||
                            process.env.VITE_GEMINI_PAID_API_KEY ||
                            process.env.VITE_GEMINI_API_KEY ||
                            process.env.VITE_API_KEY ||
                            loadedEnv.GEMINI_PAID_API_KEY ||
                            loadedEnv.GEMINI_API_KEY ||
                            loadedEnv.API_KEY ||
                            loadedEnv.VITE_GEMINI_PAID_API_KEY ||
                            loadedEnv.VITE_GEMINI_API_KEY ||
                            loadedEnv.VITE_API_KEY || '';

          if (!geminiKey) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Gemini API key not configured on server' }));
            return;
          }

          let cleanBase64 = imageBase64;
          if (cleanBase64.includes(',')) {
            cleanBase64 = cleanBase64.split(',')[1];
          }

          const { GoogleGenAI } = await import('@google/genai');
          const ai = new GoogleGenAI({ apiKey: geminiKey });

          const prompt = `You are an expert automobile inspection AI specializing in vehicle instrument clusters, speedometers, odometers, and fuel gauges for Malaysian and Asian car models (e.g. Proton Saga/Persona/Iriz/X50/X70, Perodua Myvi/Bezza/Axia/Alza/Ativa/Aruz, Toyota Vios/Yaris/Innova, Honda City/Civic, Nissan Almera/Serena, etc.).

Analyze this instrument cluster / meter photo carefully. Note that LCD screens may be amber/orange/blue/white backlit or monochrome, and may have glare, reflections, or handwritten markings (e.g. plate initials like JYC, BSN) which should be ignored.

Extract the following two values:

1. FUEL LEVEL:
- For LCD segment bar displays (horizontal or vertical bar blocks between E and F):
  * CRITICAL: You must differentiate between SOLID/FILLED blocks and HOLLOW/EMPTY outlines.
  * ONLY count the number of SOLID, FILLED dark blocks starting from 'E' towards 'F'. Do NOT count the empty hollow outlines.
  * For example, if a vertical gauge has 8 blocks total, but only the bottom 6 are solid black and the top 2 are hollow outlines, output "6 Bar".
  * Mapping:
    - 8 solid bars (all blocks filled) => "Full Tank"
    - 7 solid bars => "7 Bar"
    - 6 solid bars (approx 3/4) => "6 Bar"
    - 5 solid bars => "5 Bar"
    - 4 solid bars (halfway) => "4 Bar"
    - 3 solid bars => "3 Bar"
    - 2 solid bars (approx 1/4) => "2 Bar"
    - 1 solid bar (near 'E') => "1 Bar"
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
          } catch (firstErr: any) {
            console.warn('Gemini 3.6 flash error, trying gemini-2.5-flash:', firstErr.message);
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
          }

          const responseText = response.text || '{}';
          let result: any = {};
          try {
            const cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
            result = JSON.parse(cleanText);
          } catch (parseErr) {
            console.error('Failed to parse Gemini response JSON:', responseText);
          }

          let parsedMileage: number | null = null;
          if (result.mileage != null) {
            if (typeof result.mileage === 'number') {
              parsedMileage = Math.round(result.mileage);
            } else {
              const numStr = String(result.mileage).replace(/,/g, '').replace(/\D/g, '');
              if (numStr) {
                parsedMileage = parseInt(numStr, 10);
              }
            }
          }

          let parsedFuel = result.fuel_level || null;
          if (parsedFuel) {
            const flLower = String(parsedFuel).toLowerCase();
            
        if (flLower.includes('full') || flLower.includes('100%') || flLower.includes('8/8') || flLower === 'f' || flLower === '8') parsedFuel = 'Full Tank';
        else if (flLower.includes('75%') || flLower.includes('3/4') || flLower.includes('6/8')) parsedFuel = '6 Bar';
        else if (flLower.includes('50%') || flLower.includes('1/2') || flLower.includes('half') || flLower.includes('4/8')) parsedFuel = '4 Bar';
        else if (flLower.includes('25%') || flLower.includes('1/4') || flLower.includes('2/8')) parsedFuel = '2 Bar';
        else if (flLower.match(/\b8\b/) || flLower.includes('8 bar')) parsedFuel = 'Full Tank';
        else if (flLower.match(/\b7\b/) || flLower.includes('7 bar')) parsedFuel = '7 Bar';
        else if (flLower.match(/\b6\b/) || flLower.includes('6 bar')) parsedFuel = '6 Bar';
        else if (flLower.match(/\b5\b/) || flLower.includes('5 bar')) parsedFuel = '5 Bar';
        else if (flLower.match(/\b4\b/) || flLower.includes('4 bar')) parsedFuel = '4 Bar';
        else if (flLower.match(/\b3\b/) || flLower.includes('3 bar')) parsedFuel = '3 Bar';
        else if (flLower.match(/\b2\b/) || flLower.includes('2 bar')) parsedFuel = '2 Bar';
        else if (flLower.match(/\b1\b/) || flLower.includes('1 bar') || flLower.includes('low') || flLower.includes('empty') || flLower === 'e' || flLower.includes('0%')) parsedFuel = '1 Bar';
        else parsedFuel = result.fuel_level; // keep original if no match

          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            mileage: parsedMileage,
            fuel_level: parsedFuel,
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
    };
  }

  return {
    plugins: [
      react(),
      {
        name: 'dashboard-meter-ocr-api',
        configureServer(server) {
          server.middlewares.use(createDashboardOcrMiddleware(env));
        },
        configurePreviewServer(server) {
          server.middlewares.use(createDashboardOcrMiddleware(env));
        },
      },
    ],
    // Explicitly define process.env variables so they get replaced by actual values during build
    define: {
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseKey || ''),
      'process.env.SUPABASE_URL': JSON.stringify(supabaseUrl || ''),
      'process.env.API_KEY': JSON.stringify(apiKey || ''),
      'process.env.GEMINI_API_KEY': JSON.stringify(apiKey || ''),
      'process.env.GEMINI_PAID_API_KEY': JSON.stringify(apiKey || ''),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(apiKey || ''),
      'process.env.VITE_API_KEY': JSON.stringify(apiKey || ''),
      'process.env.VITE_GEMINI_PAID_API_KEY': JSON.stringify(apiKey || ''),
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
