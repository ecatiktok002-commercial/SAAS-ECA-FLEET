import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_PAID_API_KEY || process.env.VITE_GEMINI_API_KEY });
async function run() {
  try {
    const imageBase64 = fs.readFileSync('image.png').toString('base64');
    const prompt = `You are an expert automobile inspection AI specializing in vehicle instrument clusters, speedometers, odometers, and fuel gauges for Malaysian and Asian car models (e.g. Proton Saga/Persona/Iriz/X50/X70, Perodua Myvi/Bezza/Axia/Alza/Ativa/Aruz, Toyota Vios/Yaris/Innova, Honda City/Civic, Nissan Almera/Serena, etc.).

Analyze this screenshot which contains a small thumbnail of an instrument cluster / meter photo. Note that LCD screens may be amber/orange/blue/white backlit or monochrome, and may have glare, reflections, or handwritten markings (e.g. plate initials like JYC, BSN) which should be ignored.

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

2. MILEAGE (ODOMETER):
- Look for numbers near the letters "ODO", "km", or total distance.
- Ignore "TRIP A", "TRIP B", or "RANGE" (which tells distance to empty).
- Extract ONLY the integer odometer number (e.g. 114006).

Output strictly valid JSON with no markdown formatting or markdown code blocks:
{
  "mileage": <integer number or null>,
  "fuel_level": <"Full Tank" | "7 Bar" | "6 Bar" | "5 Bar" | "4 Bar" | "3 Bar" | "2 Bar" | "1 Bar" | null>,
  "confidence": <number 0.0 to 1.0>,
  "notes": "<brief description of what was seen on the meter>"
}`;
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        { inlineData: { data: imageBase64, mimeType: 'image/png' } },
        prompt
      ],
      config: { responseMimeType: 'application/json', temperature: 0 }
    });
    console.log(response.text);
  } catch (err) {
    console.error(err);
  }
}
run();
