const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'pages/digital-forms/CreateAgreement.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/rounded-md/g, 'rounded-lg');

fs.writeFileSync(filePath, content);
console.log('Done');
