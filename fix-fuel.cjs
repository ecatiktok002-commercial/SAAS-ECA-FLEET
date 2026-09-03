const fs = require('fs');

function fixPrompt(content) {
  const newFuelPrompt = `1. FUEL LEVEL:
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
    - 1 solid bar (near 'E') => "1 Bar"`;

  const regex = /1\. FUEL LEVEL:[\s\S]*?- 1 bar \(near 'E'\) => "1 Bar"/g;
  return content.replace(regex, newFuelPrompt);
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
    const newContent = fixPrompt(content);
    if (content !== newContent) {
      fs.writeFileSync(file, newContent);
      console.log(`Updated ${file}`);
    } else {
      console.log(`No changes made to ${file}`);
    }
  }
});
