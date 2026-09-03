const fs = require('fs');

function fixPrompt(content) {
  const newPrompt = `2. MILEAGE (ODOMETER):
- Look for numbers near the letters "ODO", "km", or total distance.
- Ignore "TRIP A", "TRIP B", or "RANGE" (which tells distance to empty).
- Extract ONLY the integer odometer number (e.g. 114006). If you see a number like "22895" next to ODO, output 22895.
- Be highly attentive to glowing amber/orange LCD screens. The contrast might be low or glaring. Read carefully.`;

  let updated = content.replace(/2\. MILEAGE \(ODOMETER\):\n- Look for numbers near the letters "ODO", "km", or total distance\.\n- Ignore "TRIP A", "TRIP B", or "RANGE" \(which tells distance to empty\)\.\n- Extract ONLY the integer odometer number \(e\.g\. 114006\)\./g, newPrompt);

  return updated;
}

let serverTs = fs.readFileSync('server.ts', 'utf8');
fs.writeFileSync('server.ts', fixPrompt(serverTs));

let aiTs = fs.readFileSync('services/aiService.ts', 'utf8');
fs.writeFileSync('services/aiService.ts', fixPrompt(aiTs));

let edgeTs = fs.readFileSync('supabase/functions/receipt-ocr/index.ts', 'utf8');
fs.writeFileSync('supabase/functions/receipt-ocr/index.ts', fixPrompt(edgeTs));

console.log("Fixed!");
