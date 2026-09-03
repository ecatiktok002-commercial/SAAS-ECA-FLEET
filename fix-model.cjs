const fs = require('fs');

function fixModel(content) {
  return content.replace(/gemini-3\.6-flash/g, 'gemini-2.5-flash');
}

['server.ts', 'services/aiService.ts', 'supabase/functions/receipt-ocr/index.ts', 'vite.config.ts'].forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, fixModel(content));
  }
});
console.log("Fixed!");
