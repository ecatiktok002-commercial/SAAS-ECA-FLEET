ALTER TABLE agreements ADD COLUMN IF NOT EXISTS transaction_date text;

-- Drop existing view before replacing it
DROP VIEW IF EXISTS subscriber_audit_view;
CREATE VIEW subscriber_audit_view AS
SELECT 
  a.id AS form_id,
  a.subscriber_id,
  a.agent_id,
  a.agent_name,
  a.customer_name,
  a.car_plate_number,
  a.total_price AS form_price,
  a.start_date AS form_start,
  a.end_date AS form_end,
  a.commission_earned,
  a.payout_status,
  CASE WHEN a.status = 'reconciled' THEN true ELSE false END AS is_receipt_verified,
  a.status,
  a.reference_number,
  a.created_at,
  a.booking_id,
  a.has_pending_changes,
  a.pending_changes,
  a.payment_receipt,
  a.ic_license_photos,
  a.transaction_date,
  b.total_price AS booking_price,
  b.start_date AS booking_start,
  b.duration_days AS booking_duration,
  b.start_date AS booking_start_date,
  b.end_date AS booking_end_date,
  b.pickup_time AS booking_pickup_time,
  b.return_time AS booking_return_time,
  b.has_discrepancy,
  b.is_dates_matched,
  b.discrepancy_reason
FROM agreements a
LEFT JOIN bookings b ON a.booking_id = b.id;
