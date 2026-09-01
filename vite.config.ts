
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

          const prompt = `You are an expert vehicle inspection AI specializing in reading automobile instrument clusters, speedometers, odometers, and fuel gauges.
Carefully inspect this vehicle meter / dashboard photo. Note that the photo might have ambient reflections, amber/orange/monochrome LCD backlights, or handwritten markings (e.g. car plate initials like JYC, BSN written in chalk or digital markup) which you should ignore.

Extract these two values:

1. FUEL LEVEL (Left Vertical Bar Gauge or Analog Needle):
- For digital LCD clusters (e.g. Proton Saga/Persona, Perodua Myvi/Bezza/Axia, Toyota, Honda):
  * Look for the vertical fuel level bar gauge on the left side between 'E' (bottom) and 'F' (top).
  * Count the total number of illuminated / dark lit bar blocks starting from the bottom 'E' bar:
    - 8 bars (up to 'F' / all bars lit) => "Full Tank"
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
- Look for the digital number next to "ODO", "km", or the main odometer display (e.g. "15952 km", "15028 km", "114006 km", "45200").
- Disregard the clock (e.g. "5:40", "3:23") and gear indicator (e.g. "P", "D").
- Extract ONLY the integer odometer reading (e.g. 114006).

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
                temperature: 0,
              },
            });
          } catch (firstErr: any) {
            console.warn('Gemini 2.5 flash error, trying gemini-2.0-flash:', firstErr.message);
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
                temperature: 0,
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
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(apiKey || ''),
      'process.env.VITE_API_KEY': JSON.stringify(apiKey || ''),
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
