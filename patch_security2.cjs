const fs = require('fs');
let content = fs.readFileSync('services/apiService.ts', 'utf8');

content = content.replace(/eq\('id', subscriberId\)/g, "eq('id', targetSubscriberId)");

fs.writeFileSync('services/apiService.ts', content);
