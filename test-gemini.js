import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_PAID_API_KEY || process.env.GEMINI_API_KEY });
async function run() {
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [{ text: "Hello" }]
    });
    console.log('Success 3.6:', res.text);
  } catch (err) {
    console.error('Error 3.6:', err.message);
  }
}
run();
