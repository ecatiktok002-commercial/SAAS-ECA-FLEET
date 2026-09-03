import { GoogleGenAI } from '@google/genai';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_PAID_API_KEY || process.env.VITE_GEMINI_API_KEY });
async function run() {
  try {
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

    // Get the myvi meter image from wikipedia
    const imgRes = await fetch('https://upload.wikimedia.org/wikipedia/commons/e/ec/2018_Perodua_Myvi_1.5_Advance_instrument_cluster_-_40539130092.jpg');
    const buffer = await imgRes.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
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
