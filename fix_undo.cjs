const fs = require('fs');
let content = fs.readFileSync('services/apiService.ts', 'utf8');

content = content.replace(
  "let query = supabase.from('cars').select('form_id, subscriber_id, agent_id, agent_name, customer_name, car_plate_number, form_price, form_start, form_end, commission_earned, payout_status, is_receipt_verified, status');",
  "let query = supabase.from('cars').select('*');"
);

// Now apply the select carefully to getAuditRecords
content = content.replace(
  "let query = supabase\n        .from('subscriber_audit_view')\n        .select('*');",
  "let query = supabase\n        .from('subscriber_audit_view')\n        .select('form_id, subscriber_id, agent_id, agent_name, customer_name, car_plate_number, form_price, form_start, form_end, commission_earned, payout_status, is_receipt_verified, status');"
);

fs.writeFileSync('services/apiService.ts', content);
