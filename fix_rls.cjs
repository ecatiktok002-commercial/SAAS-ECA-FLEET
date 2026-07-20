const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://czurhanyrjgeicnbrnev.supabase.co";
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(/['"]/g, '');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    let sql = `
CREATE OR REPLACE FUNCTION record_subscriber_payment()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier_price DECIMAL(10, 2);
  v_months_diff INTEGER;
  v_base_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Determine tier price
  IF NEW.tier = 'Tier 1' THEN v_tier_price := 50;
  ELSIF NEW.tier = 'Tier 2' THEN v_tier_price := 50;
  ELSIF NEW.tier = 'Tier 3' THEN v_tier_price := 150;
  ELSE v_tier_price := 0;
  END IF;

  -- If it's a trial or no expiry, no revenue contribution
  IF NEW.is_trial = TRUE OR NEW.expiry_date IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate months added
  IF (TG_OP = 'INSERT') THEN
    v_months_diff := (EXTRACT(YEAR FROM NEW.expiry_date) - EXTRACT(YEAR FROM NEW.subscription_start_date)) * 12 +
                     (EXTRACT(MONTH FROM NEW.expiry_date) - EXTRACT(MONTH FROM NEW.subscription_start_date));
    
    IF EXTRACT(DAY FROM NEW.expiry_date) > EXTRACT(DAY FROM NEW.subscription_start_date) THEN
        v_months_diff := v_months_diff + 1;
    END IF;
    
    IF v_months_diff <= 0 AND NEW.expiry_date > NEW.subscription_start_date THEN
        v_months_diff := 1;
    END IF;

    IF v_months_diff > 0 THEN
      INSERT INTO subscriber_payments (subscriber_id, amount, tier, months_added, payment_date)
      VALUES (NEW.id, v_months_diff * v_tier_price, NEW.tier, v_months_diff, NEW.subscription_start_date);
    END IF;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF NEW.expiry_date > OLD.expiry_date OR (OLD.expiry_date IS NULL AND NEW.expiry_date IS NOT NULL) THEN
      v_base_date := COALESCE(OLD.expiry_date, NOW());
      
      v_months_diff := (EXTRACT(YEAR FROM NEW.expiry_date) - EXTRACT(YEAR FROM v_base_date)) * 12 +
                       (EXTRACT(MONTH FROM NEW.expiry_date) - EXTRACT(MONTH FROM v_base_date));
      
      IF EXTRACT(DAY FROM NEW.expiry_date) > EXTRACT(DAY FROM v_base_date) THEN
          v_months_diff := v_months_diff + 1;
      END IF;

      IF v_months_diff <= 0 AND NEW.expiry_date > v_base_date THEN
          v_months_diff := 1;
      END IF;

      IF v_months_diff > 0 THEN
        INSERT INTO subscriber_payments (subscriber_id, amount, tier, months_added, payment_date)
        VALUES (NEW.id, v_months_diff * v_tier_price, NEW.tier, v_months_diff, NOW());
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE subscriber_payments DISABLE ROW LEVEL SECURITY;
`;
    // We don't have exec_sql rpc. So let's use supabase API if we can, or just tell the user to run it?
    // Oh wait, pg module is installed!
    console.log("pg is installed!");
}
run();
