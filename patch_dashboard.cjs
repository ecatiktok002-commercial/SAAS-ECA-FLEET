const fs = require('fs');
let content = fs.readFileSync('pages/digital-forms/AgreementDashboard.tsx', 'utf8');

// The line appears multiple times
content = content.replace(/const isPaid = true; \/\/ Original rule doesn't mandate receipt for completed/g, 'const isPaid = hasReceipt;');

fs.writeFileSync('pages/digital-forms/AgreementDashboard.tsx', content);
console.log("Patched AgreementDashboard.tsx");
