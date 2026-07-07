const fs = require('fs');
let content = fs.readFileSync('services/apiService.ts', 'utf8');

const oldSelect = ".select('*');";
const newSelect = ".select('form_id, subscriber_id, agent_id, agent_name, customer_name, car_plate_number, form_price, form_start, form_end, commission_earned, payout_status, is_receipt_verified, status');";

content = content.replace(oldSelect, newSelect);

const oldReturn = "return data || [];";
const newReturn = "return (data || []).map(d => ({\n        ...d,\n        payment_receipt: ['upcoming', 'completed', 'reconciled'].includes(d.status) ? 'exists' : undefined\n      }));";

content = content.replace(oldReturn, newReturn);

fs.writeFileSync('services/apiService.ts', content);
