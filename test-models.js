import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_PAID_API_KEY || process.env.VITE_GEMINI_API_KEY });
async function run() {
  try {
    const response = await ai.models.list();
    for await (const m of response) {
      console.log(m.name);
    }
  } catch (err) {
    console.error(err);
  }
}
run();
