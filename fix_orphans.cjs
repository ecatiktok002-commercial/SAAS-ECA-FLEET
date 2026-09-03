const fs = require('fs');
let content = fs.readFileSync('pages/AuditPayoutManagement.tsx', 'utf8');

content = content.replace(
  'currentMonthRecords.filter(r => r.booking_id == null),',
  'currentMonthRecords.filter(r => r.booking_id == null && r.payout_status !== \'approved\' && r.payout_status !== \'paid\'),'
);

fs.writeFileSync('pages/AuditPayoutManagement.tsx', content);
