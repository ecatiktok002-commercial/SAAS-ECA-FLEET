const fs = require('fs');
let content = fs.readFileSync('pages/AuditPayoutManagement.tsx', 'utf8');

content = content.replace('setSelectedAgentBookings(prev => {', 'setSelectedAgentBookings((prev: any) => {');
content = content.replace('const newRecords = prev.records.filter(r => r.form_id !== record.form_id);', 'const newRecords = prev.records.filter((r: any) => r.form_id !== record.form_id);');
content = content.replace('const newRevenue = newRecords.reduce((sum, r) => sum + (Number(r.form_price) || 0), 0);', 'const newRevenue = newRecords.reduce((sum: number, r: any) => sum + (Number(r.form_price) || 0), 0);');

fs.writeFileSync('pages/AuditPayoutManagement.tsx', content);
