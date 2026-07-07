const fs = require('fs');
let content = fs.readFileSync('services/apiService.ts', 'utf8');

// getAgreements
content = content.replace(
  "const { data, error } = await query.order('created_at', { ascending: false });",
  "const { data, error } = await query.order('created_at', { ascending: false }).limit(500);"
);

// getBookings
content = content.replace(
  "const { data, error } = await query.order('pickup_datetime', { ascending: false });",
  "const { data, error } = await query.order('pickup_datetime', { ascending: false }).limit(500);"
);

// getDigitalForms
content = content.replace(
  "const { data, error } = await query.order('created_at', { ascending: false });",
  "const { data, error } = await query.order('created_at', { ascending: false }).limit(500);"
);

// getAuditRecords (Wait, let's find getAuditRecords)
fs.writeFileSync('services/apiService.ts', content);
