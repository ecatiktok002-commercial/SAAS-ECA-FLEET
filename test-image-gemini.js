import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_PAID_API_KEY || process.env.VITE_GEMINI_API_KEY });
async function run() {
  try {
    const base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        { inlineData: { data: base64Image, mimeType: 'image/png' } },
        'Describe this image.'
      ],
    });
    console.log(response.text);
  } catch (err) {
    console.error(err.message);
  }
}
run();
