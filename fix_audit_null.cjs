const fs = require('fs');
let content = fs.readFileSync('services/apiService.ts', 'utf8');

const oldReturn = "payment_receipt: ['upcoming', 'completed', 'reconciled'].includes(d.status) ? 'exists' : undefined";
const newReturn = "payment_receipt: ['upcoming', 'completed', 'reconciled'].includes(d.status) ? 'exists' : null";

content = content.replace(oldReturn, newReturn);
fs.writeFileSync('services/apiService.ts', content);
