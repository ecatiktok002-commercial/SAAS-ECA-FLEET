import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Helper to retrieve Gemini API Key
  const getGeminiKey = () => {
    return process.env.GEMINI_PAID_API_KEY ||
           process.env.GEMINI_API_KEY ||
           process.env.API_KEY ||
           process.env.VITE_GEMINI_PAID_API_KEY ||
           process.env.VITE_GEMINI_API_KEY ||
           process.env.VITE_API_KEY || '';
  };

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // AI Dashboard Meter Identification Endpoint
  app.post('/api/identify-dashboard', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg' } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ success: false, error: 'Missing imageBase64 in request body' });
      }

      const geminiKey = getGeminiKey();
      if (!geminiKey) {
        return res.status(500).json({ success: false, error: 'Gemini API key is not configured' });
      }

      let cleanBase64 = imageBase64;
      if (cleanBase64.includes(',')) {
        cleanBase64 = cleanBase64.split(',')[1];
      }

      const ai = new GoogleGenAI({ apiKey: geminiKey });

      const prompt = `You are an expert vehicle inspection AI specializing in reading automobile instrument clusters, speedometers, odometers, and fuel gauges.
Carefully inspect this vehicle meter / dashboard photo. Note that the photo might have ambient reflections, amber/orange/monochrome LCD backlights, or handwritten markings (e.g. car plate initials like JYC, BSN written in chalk or digital markup) which you should ignore.

Extract these two values:

1. FUEL LEVEL (Left Vertical Bar Gauge or Analog Needle):
- For digital LCD clusters (e.g. Proton Saga/Persona/Iriz, Perodua Myvi/Bezza/Axia/Alza, Toyota, Honda, Nissan):
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
- Disregard the clock (e.g. "5:40", "3:23") and gear indicator (e.g. "P", "D", "R", "N").
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
            temperature: 0,
          },
        });
      }

      const responseText = response.text || '{}';
      const result = JSON.parse(responseText);

      return res.json({
        success: true,
        mileage: typeof result.mileage === 'number' ? Math.round(result.mileage) : (result.mileage ? parseInt(String(result.mileage).replace(/\D/g, ''), 10) : null),
        fuel_level: result.fuel_level || null,
        confidence: result.confidence ?? 0.9,
        notes: result.notes || '',
      });
    } catch (err: any) {
      console.error('Error analyzing dashboard photo in /api/identify-dashboard:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to analyze dashboard' });
    }
  });

  // Vite middleware in dev or static files in prod
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
