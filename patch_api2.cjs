const fs = require('fs');
let content = fs.readFileSync('services/apiService.ts', 'utf8');

const search = `        .select('form_id, subscriber_id, agent_id, agent_name, customer_name, car_plate_number, form_price, form_start, form_end, commission_earned, payout_status, is_receipt_verified, status, reference_number, created_at, booking_id, booking_price, booking_start, booking_duration, booking_start_date, booking_end_date, booking_pickup_time, booking_return_time, has_discrepancy, is_dates_matched, discrepancy_reason, has_pending_changes, pending_changes, payment_receipt');`;
const replace = `        .select('form_id, subscriber_id, agent_id, agent_name, customer_name, car_plate_number, form_price, form_start, form_end, commission_earned, payout_status, is_receipt_verified, status, reference_number, created_at, booking_id, booking_price, booking_start, booking_duration, booking_start_date, booking_end_date, booking_pickup_time, booking_return_time, has_discrepancy, is_dates_matched, discrepancy_reason, has_pending_changes, pending_changes, payment_receipt, ic_license_photos');`;

const search2 = `        return {
          ...d,
          payment_receipt: hasReceipt ? 'exists' : null
        };`;
const replace2 = `        let hasIc = false;
        if (d.ic_license_photos && d.ic_license_photos !== '[]' && d.ic_license_photos !== 'null') {
           hasIc = true;
        }
        if (d.has_pending_changes && d.pending_changes && d.pending_changes.ic_license_photos && d.pending_changes.ic_license_photos !== '[]' && d.pending_changes.ic_license_photos !== 'null') {
           hasIc = true;
        }
        return {
          ...d,
          payment_receipt: hasReceipt ? 'exists' : null,
          ic_license_photos: hasIc ? 'exists' : null
        };`;

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
