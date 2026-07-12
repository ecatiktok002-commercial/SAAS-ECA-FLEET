const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabaseUrl = "https://czurhanyrjgeicnbrnev.supabase.co";
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(/['"]/g, '');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.time("DirectJoin");
    let { data, error } = await supabase.from('agreements').select(`
        id, subscriber_id, agent_id, agent_name, customer_name, car_plate_number, 
        total_price, start_date, end_date, commission_earned, payout_status, 
        is_receipt_verified, status, reference_number, created_at, booking_id, 
        has_pending_changes, pending_changes, payment_receipt, ic_license_photos,
        bookings (
            id, total_price, start_date, pickup_datetime, duration_days, duration, 
            pickup_time, has_discrepancy, is_dates_matched, discrepancy_reason, status
        )
    `).in('status', ['completed', 'reconciled', 'signed']).order('id', { ascending: false }).limit(200);
    console.timeEnd("DirectJoin");
    console.log("Records:", data ? data.length : 0);
    if (error) console.error(error);
}
run();
