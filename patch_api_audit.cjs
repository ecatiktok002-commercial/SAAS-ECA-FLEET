const fs = require('fs');
let content = fs.readFileSync('services/apiService.ts', 'utf8');

const search = `        .select('form_id, subscriber_id, agent_id, agent_name, customer_name, car_plate_number, form_price, form_start, form_end, commission_earned, payout_status, is_receipt_verified, status, reference_number, created_at, booking_id, booking_price, booking_start, booking_duration, booking_start_date, booking_end_date, booking_pickup_time, booking_return_time, has_discrepancy, is_dates_matched, discrepancy_reason, has_pending_changes, pending_changes');`;
const replace = `        .select('form_id, subscriber_id, agent_id, agent_name, customer_name, car_plate_number, form_price, form_start, form_end, commission_earned, payout_status, is_receipt_verified, status, reference_number, created_at, booking_id, booking_price, booking_start, booking_duration, booking_start_date, booking_end_date, booking_pickup_time, booking_return_time, has_discrepancy, is_dates_matched, discrepancy_reason, has_pending_changes, pending_changes, payment_receipt');`;

const search2 = `      return (data || []).map(d => ({
        ...d,
        payment_receipt: ['upcoming', 'completed', 'reconciled'].includes(d.status) ? 'exists' : null
      }));`;
const replace2 = `      return (data || []).map(d => {
        let hasReceipt = false;
        if (d.payment_receipt && d.payment_receipt !== '[]' && d.payment_receipt !== 'null') {
           hasReceipt = true;
        }
        if (d.has_pending_changes && d.pending_changes && d.pending_changes.payment_receipt && d.pending_changes.payment_receipt !== '[]' && d.pending_changes.payment_receipt !== 'null') {
           hasReceipt = true;
        }
        return {
          ...d,
          payment_receipt: hasReceipt ? 'exists' : null
        };
      });`;

if (content.indexOf(search) !== -1) {
    content = content.replace(search, replace);
    if (content.indexOf(search2) !== -1) {
        content = content.replace(search2, replace2);
        fs.writeFileSync('services/apiService.ts', content);
        console.log("Patched apiService.ts successfully");
    } else {
        console.log("Could not find search2");
    }
} else {
    console.log("Could not find search1");
}
