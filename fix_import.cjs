const fs = require('fs');
let content = fs.readFileSync('pages/AuditPayoutManagement.tsx', 'utf8');

content = content.replace("} Undo from 'lucide-react';", ", Undo } from 'lucide-react';");

fs.writeFileSync('pages/AuditPayoutManagement.tsx', content);
