DROP VIEW IF EXISTS customer_crm_view;
CREATE OR REPLACE VIEW customer_crm_view AS
WITH completed_records AS (
    SELECT 
        id,
        customer_id, 
        subscriber_id, 
        agent_name, 
        start_date,
        end_date,
        created_at,
        status
        -- Removed payment_receipt to prevent TOAST/memory issues
    FROM agreements 
    WHERE (status = 'completed') 
      AND COALESCE(start_date, created_at::date) <= CURRENT_DATE
),
customer_stats AS (
    SELECT 
        customer_id,
        subscriber_id,
        COUNT(*) as total_bookings,
        MAX(COALESCE(end_date, start_date, created_at::date)) as last_rental_date,
        MAX(agent_name) as acquired_by_agent
    FROM completed_records
    GROUP BY customer_id, subscriber_id
)
SELECT 
    c.id,
    c.subscriber_id,
    c.full_name,
    c.phone_number,
    c.ic_passport,
    COALESCE(s.total_bookings, 0) as total_bookings,
    s.last_rental_date,
    s.acquired_by_agent,
    CASE 
        WHEN s.total_bookings = 0 THEN 'New'
        WHEN s.last_rental_date >= CURRENT_DATE - INTERVAL '30 days' THEN 'Active'
        WHEN s.last_rental_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'Dormant'
        ELSE 'Inactive'
    END as status
FROM customers c
LEFT JOIN customer_stats s ON c.id = s.customer_id AND c.subscriber_id = s.subscriber_id;
