require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  const sql = `
CREATE OR REPLACE VIEW agreements_light AS
SELECT 
    a.id as form_id,
    a.subscriber_id,
    a.agent_id,
    a.agent_name,
    a.customer_name,
    a.car_plate_number,
    a.total_price as form_price,
    a.start_date as form_start,
    a.end_date as form_end,
    a.payment_receipt,
    a.commission_earned,
    COALESCE(a.payout_status, 'pending') as payout_status,
    a.is_receipt_verified,
    CASE 
        WHEN a.status = 'reconciled' THEN 'reconciled'
        WHEN (a.status = 'completed' OR b.status = 'completed') 
             AND COALESCE(a.start_date, a.created_at::date) > CURRENT_DATE THEN 'upcoming'
        WHEN a.status = 'completed' OR b.status = 'completed' THEN 'completed'
        ELSE a.status 
    END as status,
    a.reference_number,
    a.created_at,
    a.booking_id,
    b.total_price as booking_price,
    COALESCE(b.start_date, b.pickup_datetime::date) as booking_start,
    COALESCE(b.duration_days, b.duration) as booking_duration,
    COALESCE(b.start_date, b.pickup_datetime::date) as booking_start_date,
    (COALESCE(b.start_date, b.pickup_datetime::date) + (COALESCE(b.duration_days, b.duration) * interval '1 day'))::date as booking_end_date,
    b.pickup_time as booking_pickup_time,
    NULL::time as booking_return_time,
    b.has_discrepancy,
    b.is_dates_matched,
    b.discrepancy_reason,
    a.has_pending_changes,
    a.pending_changes
FROM agreements a
LEFT JOIN bookings b ON a.booking_id::uuid = b.id
WHERE a.status IN ('completed', 'reconciled', 'signed')
   OR b.status = 'completed'
   OR a.booking_id IS NOT NULL;
`;

  const { error } = await supabase.rpc('run_sql', { sql_statement: sql });
  if (error) {
    console.error("Error updating view via RPC:", error);
  } else {
    console.log("View updated successfully.");
  }
}
run();
