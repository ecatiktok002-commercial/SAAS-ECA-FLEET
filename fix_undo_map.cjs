const fs = require('fs');
let content = fs.readFileSync('services/apiService.ts', 'utf8');

const badReturn = "return (data || []).map(d => ({\n        ...d,\n        payment_receipt: ['upcoming', 'completed', 'reconciled'].includes(d.status) ? 'exists' : undefined\n      }));";

content = content.replace(badReturn, "return data || [];");

const newReturn = "return (data || []).map(d => ({\n        ...d,\n        payment_receipt: ['upcoming', 'completed', 'reconciled'].includes(d.status) ? 'exists' : undefined\n      }));";

content = content.replace(
  "        throw new Error('Failed to fetch audit records');\n      }\n      return data || [];",
  "        throw new Error('Failed to fetch audit records');\n      }\n      " + newReturn
);

fs.writeFileSync('services/apiService.ts', content);
