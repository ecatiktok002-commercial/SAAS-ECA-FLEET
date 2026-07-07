const fs = require('fs');
let content = fs.readFileSync('pages/digital-forms/SignAgreement.tsx', 'utf8');

content = content.replace(/margin:\s*\[0, 0, 0, 0\]/, 'margin: [10, 0, 60, 0]');

fs.writeFileSync('pages/digital-forms/SignAgreement.tsx', content);
console.log("Replaced margin");
