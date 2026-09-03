const fs = require('fs');

const files = [
  'server.ts', 
  'vite.config.ts', 
  'supabase/functions/receipt-ocr/index.ts', 
  'services/aiService.ts'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Remove from prompt JSON schema
    content = content.replace(/,\s*"notes": "<brief description of what was seen on the meter>"/g, '');
    
    // Remove from parsed logs / responses
    content = content.replace(/, notes: result\.notes \}\);/g, ' });');
    content = content.replace(/,\n\s*notes: result\.notes \|\| '',/g, '');
    content = content.replace(/,\n\s*notes: parsed\.notes,/g, '');
    content = content.replace(/,\n\s*notes: parsedResult\.notes,/g, '');
    
    fs.writeFileSync(file, content);
    console.log(`Cleaned ${file}`);
  }
});
