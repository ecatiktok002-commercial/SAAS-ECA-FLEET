DROP VIEW IF EXISTS subscriber_audit_view;
CREATE OR REPLACE VIEW subscriber_audit_view AS
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
    CASE 
        WHEN a.payment_receipt IS NOT NULL AND a.payment_receipt != '' AND a.payment_receipt != '[]' AND a.payment_receipt != 'null' THEN 'exists' 
        ELSE NULL 
    END as payment_receipt,
    a.commission_earned,
    COALESCE(a.payout_status, 'pending') as payout_status,
    a.is_receipt_verified,
    CASE 
        WHEN a.status = 'reconciled' THEN 'reconciled'
        WHEN (a.status = 'completed' OR b.status = 'completed' OR (a.status = 'signed' AND a.payment_receipt IS NOT NULL AND a.payment_receipt != '')) 
             AND COALESCE(a.start_date, a.created_at::date) > CURRENT_DATE THEN 'upcoming'
        WHEN a.status = 'completed' OR b.status = 'completed' OR (a.status = 'signed' AND a.payment_receipt IS NOT NULL AND a.payment_receipt != '') THEN 'completed'
        ELSE a.status 
    END as status
FROM agreements a
LEFT JOIN bookings b ON a.booking_id = b.id
WHERE a.status IN ('completed', 'reconciled') OR (a.status = 'signed' AND a.payment_receipt IS NOT NULL AND a.payment_receipt != '');
