const fs = require('fs');
let content = fs.readFileSync('services/apiService.ts', 'utf8');

const oldSelect = ".select('form_id, subscriber_id, agent_id, agent_name, customer_name, car_plate_number, form_price, form_start, form_end, commission_earned, payout_status, is_receipt_verified, status');";

const newSelect = ".select('form_id, subscriber_id, agent_id, agent_name, customer_name, car_plate_number, form_price, form_start, form_end, commission_earned, payout_status, is_receipt_verified, status, reference_number, created_at, booking_id, booking_price, booking_start, booking_duration, booking_start_date, booking_end_date, booking_pickup_time, booking_return_time, has_discrepancy, is_dates_matched, discrepancy_reason, has_pending_changes, pending_changes');";

content = content.replace(oldSelect, newSelect);
fs.writeFileSync('services/apiService.ts', content);
