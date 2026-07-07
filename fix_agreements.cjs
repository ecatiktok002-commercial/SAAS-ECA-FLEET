const fs = require('fs');
let content = fs.readFileSync('services/apiService.ts', 'utf8');

const oldSelect = "let query = supabase.from('agreements_light').select('*');";
const newSelect = "let query = supabase.from('agreements').select('id, reference_number, subscriber_id, agent_id, agent_name, customer_id, customer_name, identity_number, customer_phone, billing_address, emergency_contact_name, emergency_contact_relation, rental_purpose, car_plate_number, car_model, start_date, end_date, total_price, deposit, duration_days, pickup_time, return_time, need_einvoice, status, signed_at, created_at, booking_id, is_receipt_verified, payout_status, commission_earned, has_pending_changes');";

content = content.replace(oldSelect, newSelect);
fs.writeFileSync('services/apiService.ts', content);
