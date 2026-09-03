const fs = require('fs');

function optimizePrompt(content) {
  // Remove "notes" from the prompt
  let updated = content.replace(/,\n\s*"notes": "<brief description of what was seen on the meter>"/g, '');
  updated = updated.replace(/,\n\s*"notes": result\.notes \|\| ''/g, '');
  updated = updated.replace(/notes: result\.notes \?\? ''/g, '');
  
  return updated;
}

const files = [
  'server.ts', 
  'vite.config.ts', 
  'supabase/functions/receipt-ocr/index.ts', 
  'services/aiService.ts'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    const newContent = optimizePrompt(content);
    if (content !== newContent) {
      fs.writeFileSync(file, newContent);
      console.log(`Updated ${file}`);
    }
  }
});
