const fs = require('fs');
let content = fs.readFileSync('pages/AuditPayoutManagement.tsx', 'utf8');

const regex = /<div className="flex items-center gap-4">\s*<div className="text-2xl font-bold text-slate-900">RM \{readyForPayoutSum\.toFixed\(2\)\}<\/div>\s*<button[\s\S]*?<\/button>\s*<\/div>/;

content = content.replace(regex, '<div className="text-2xl font-bold text-slate-900">RM {readyForPayoutSum.toFixed(2)}</div>');

fs.writeFileSync('pages/AuditPayoutManagement.tsx', content);
