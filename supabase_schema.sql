-- ===============================================================
-- SUPABASE FLEET TRACK SCHEMA
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ===============================================================

-- WARNING: UNCOMMENT THE FOLLOWING LINES TO COMPLETELY RESET YOUR DATABASE
-- THIS WILL DELETE ALL EXISTING DATA. ONLY DO THIS IF YOU WANT A FRESH START.
-- DROP TABLE IF EXISTS handover_records CASCADE;
-- DROP TABLE IF EXISTS logs CASCADE;
-- DROP TABLE IF EXISTS expenses CASCADE;
-- DROP TABLE IF EXISTS digital_forms CASCADE;
-- DROP TABLE IF EXISTS agreements CASCADE;
-- DROP TABLE IF EXISTS bookings CASCADE;
-- DROP TABLE IF EXISTS members CASCADE;
-- DROP TABLE IF EXISTS cars CASCADE;
-- DROP TABLE IF EXISTS staff_members CASCADE;
-- DROP TABLE IF EXISTS companies CASCADE;
-- DROP FUNCTION IF EXISTS verify_login_uid CASCADE;

-- TROUBLESHOOTING: Missing Columns
-- If you get an error like "Could not find the 'designated_uid' column", 
-- it means your table exists but is missing a column. Run these fixes:
--
-- ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS designated_uid TEXT;
-- ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff';
-- ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS pin_hash TEXT;
-- ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS commission_tier_override TEXT DEFAULT 'auto';
--
-- ALTER TABLE agreements ADD COLUMN IF NOT EXISTS total_price NUMERIC DEFAULT 0;
-- ALTER TABLE agreements ADD COLUMN IF NOT EXISTS deposit NUMERIC DEFAULT 0;
-- ALTER TABLE agreements ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 1;
-- ALTER TABLE agreements ADD COLUMN IF NOT EXISTS signature_data TEXT;
-- ALTER TABLE agreements ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE;
-- ALTER TABLE agreements ADD COLUMN IF NOT EXISTS created_by TEXT;
-- ALTER TABLE digital_forms ADD COLUMN IF NOT EXISTS signature_data TEXT;
-- ALTER TABLE digital_forms ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE;
-- ALTER TABLE digital_forms ADD COLUMN IF NOT EXISTS created_by TEXT;
-- ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_by TEXT;
-- ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by TEXT;
--
-- ALTER TABLE companies ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'tier_1';
-- ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
-- ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
-- ALTER TABLE companies ADD COLUMN IF NOT EXISTS ssm_logo_url TEXT;
-- ALTER TABLE companies ADD COLUMN IF NOT EXISTS spdp_logo_url TEXT;
-- ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT;
--
-- FIX ALL MISSING COLUMNS (Run this if you see "column missing" errors):
-- ALTER TABLE cars ADD COLUMN IF NOT EXISTS plate_number TEXT;
-- ALTER TABLE cars ADD COLUMN IF NOT EXISTS make TEXT;
-- ALTER TABLE cars ADD COLUMN IF NOT EXISTS model TEXT;
-- ALTER TABLE cars ADD COLUMN IF NOT EXISTS roadtax_expiry DATE;
-- ALTER TABLE cars ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
-- ALTER TABLE cars ADD COLUMN IF NOT EXISTS inspection_expiry DATE;
-- ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff';
-- ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS pin_hash TEXT;
--
-- FIX MISSING SUBSCRIBER_ID ERRORS:
-- ALTER TABLE members ADD COLUMN IF NOT EXISTS subscriber_id UUID REFERENCES companies(id) ON DELETE CASCADE;
-- ALTER TABLE bookings ADD COLUMN IF NOT EXISTS subscriber_id UUID REFERENCES companies(id) ON DELETE CASCADE;
-- ALTER TABLE agreements ADD COLUMN IF NOT EXISTS subscriber_id UUID REFERENCES companies(id) ON DELETE CASCADE;
-- ALTER TABLE digital_forms ADD COLUMN IF NOT EXISTS subscriber_id UUID REFERENCES companies(id) ON DELETE CASCADE;
-- ALTER TABLE expenses ADD COLUMN IF NOT EXISTS subscriber_id UUID REFERENCES companies(id) ON DELETE CASCADE;
-- ALTER TABLE logs ADD COLUMN IF NOT EXISTS subscriber_id UUID REFERENCES companies(id) ON DELETE CASCADE;
-- ALTER TABLE handover_records ADD COLUMN IF NOT EXISTS subscriber_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Subscribers Table
-- Check if 'companies' exists and migrate/rename to 'subscribers'
DO $$ 
DECLARE
    col_exists_tier boolean;
    col_exists_active boolean;
    col_exists_trial boolean;
    col_exists_status boolean;
    col_exists_start boolean;
BEGIN 
  -- Case 1: companies exists, subscribers does not -> Rename
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'companies') AND NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'subscribers') THEN
    ALTER TABLE companies RENAME TO subscribers;
  
  -- Case 2: both exist, subscribers is empty, companies is not -> Migrate data
  ELSIF EXISTS (SELECT FROM pg_tables WHERE tablename = 'companies') AND EXISTS (SELECT FROM pg_tables WHERE tablename = 'subscribers') THEN
    IF (SELECT count(*) FROM subscribers) = 0 AND (SELECT count(*) FROM companies) > 0 THEN
      
      -- Check which columns exist in the old 'companies' table
      SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='tier') INTO col_exists_tier;
      SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='is_active') INTO col_exists_active;
      SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='is_trial') INTO col_exists_trial;
      SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='status') INTO col_exists_status;
      SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='subscription_start_date') INTO col_exists_start;

      -- Use dynamic SQL to build the insert based on existing columns
      EXECUTE format('
        INSERT INTO subscribers (id, name, tier, is_active, status, is_trial, expiry_date, subscription_start_date, created_at)
        SELECT 
          id, 
          name, 
          %s, -- tier
          %s, -- is_active
          %s, -- status
          %s, -- is_trial
          expiry_date, 
          %s, -- subscription_start_date
          created_at
        FROM companies',
        CASE WHEN col_exists_tier THEN 'tier' ELSE '''Tier 1''' END,
        CASE WHEN col_exists_active THEN 'is_active' ELSE 'TRUE' END,
        CASE WHEN col_exists_status THEN 'status' ELSE '''ACTIVE''' END,
        CASE WHEN col_exists_trial THEN 'is_trial' ELSE 'FALSE' END,
        CASE WHEN col_exists_start THEN 'subscription_start_date' ELSE 'NOW()' END
      );
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY, -- Matches Auth UID
  name TEXT NOT NULL,
  tier TEXT DEFAULT 'Tier 1',
  is_active BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'ACTIVE',
  is_trial BOOLEAN DEFAULT FALSE,
  expiry_date TIMESTAMP WITH TIME ZONE,
  subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure columns exist if table was already created
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'Tier 1';
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Staff Members
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  designated_uid TEXT NOT NULL,
  role TEXT DEFAULT 'staff',
  pin_hash TEXT,
  commission_tier_override TEXT DEFAULT 'auto',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subscriber_id, designated_uid)
);

-- Ensure columns exist if table was already created
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS commission_tier_override TEXT DEFAULT 'auto';

-- 3. Cars Table
CREATE TABLE IF NOT EXISTS cars (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  plate TEXT NOT NULL,
  type TEXT DEFAULT 'Economy',
  status TEXT DEFAULT 'active',
  plate_number TEXT,
  make TEXT,
  model TEXT,
  roadtax_expiry DATE,
  insurance_expiry DATE,
  inspection_expiry DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Members (Customers)
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  identity_number TEXT,
  billing_address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_relation TEXT,
  color TEXT DEFAULT 'bg-blue-500',
  staff_id UUID REFERENCES staff_members(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  agent_id UUID, -- The staff member who created it
  start TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  total_price NUMERIC DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Agreements (Sales)
CREATE TABLE IF NOT EXISTS agreements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  identity_number TEXT,
  customer_phone TEXT,
  billing_address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_relation TEXT,
  car_plate_number TEXT,
  car_model TEXT,
  start_date DATE,
  end_date DATE,
  total_price NUMERIC NOT NULL DEFAULT 0,
  deposit NUMERIC DEFAULT 0,
  duration_days INTEGER,
  pickup_time TIME,
  return_time TIME,
  need_einvoice BOOLEAN DEFAULT FALSE,
  payment_receipt TEXT,
  signature_data TEXT,
  photos_url TEXT[],
  status TEXT DEFAULT 'pending',
  signed_at TIMESTAMP WITH TIME ZONE,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure columns exist if table was already created
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS subscriber_id UUID REFERENCES subscribers(id) ON DELETE CASCADE;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS photos_url TEXT[];

-- 7. Digital Forms
CREATE TABLE IF NOT EXISTS digital_forms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  agent_id UUID, -- The staff member who created it
  agent_name TEXT,
  customer_name TEXT NOT NULL,
  identity_number TEXT,
  customer_phone TEXT,
  billing_address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_relation TEXT,
  car_plate_number TEXT,
  car_model TEXT,
  start_date DATE,
  end_date DATE,
  total_price NUMERIC NOT NULL DEFAULT 0,
  deposit NUMERIC DEFAULT 0,
  duration_days INTEGER,
  pickup_time TIME,
  return_time TIME,
  need_einvoice BOOLEAN DEFAULT FALSE,
  payment_receipt TEXT,
  signature_data TEXT,
  status TEXT DEFAULT 'pending',
  signed_at TIMESTAMP WITH TIME ZONE,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  car_id UUID REFERENCES cars(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Logs
CREATE TABLE IF NOT EXISTS logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  user_id UUID,
  staff_name TEXT,
  action TEXT NOT NULL,
  details TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Handover Records
CREATE TABLE IF NOT EXISTS handover_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  mileage INTEGER,
  fuel_level INTEGER,
  notes TEXT,
  photos_url TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Customers Table (CRM)
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  ic_passport TEXT,
  billing_address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_relation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subscriber_id, ic_passport)
);

-- Ensure columns exist if table was already created
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT;

-- Add customer_id to agreements and digital_forms
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE digital_forms ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- 12. Marketing Events
CREATE TABLE IF NOT EXISTS marketing_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_goal NUMERIC NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================================
-- RLS POLICIES
-- ===============================================================

ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_events ENABLE ROW LEVEL SECURITY;

-- Helper to check if user is a Subscriber (Company Owner)
-- In this system, the company ID matches the Auth UID of the owner
CREATE OR REPLACE FUNCTION is_subscriber(check_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- A user is a subscriber if their auth.uid() matches the subscriber id
  -- and they are NOT an agent (not in staff_members with a different role)
  -- Actually, the simplest check is if auth.uid() = check_id
  RETURN auth.uid() = check_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper to get subscriber_id for the current authenticated user
CREATE OR REPLACE FUNCTION current_subscriber_id()
RETURNS UUID AS $$
DECLARE
  comp_id UUID;
BEGIN
  -- 1. Check if user is a subscriber (their UID is a subscriber ID)
  SELECT id INTO comp_id FROM subscribers WHERE id = auth.uid();
  IF comp_id IS NOT NULL THEN
    RETURN comp_id;
  END IF;
  
  -- 2. Check if user is an agent (linked via designated_uid)
  -- We use designated_uid to match the auth.uid()
  SELECT subscriber_id INTO comp_id FROM staff_members WHERE designated_uid = auth.uid()::text LIMIT 1;
  RETURN comp_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Subscribers
DROP POLICY IF EXISTS "Subscribers access" ON subscribers;
CREATE POLICY "Subscribers access" ON subscribers 
  FOR ALL USING (
    auth.uid() = id -- Subscriber
    OR 
    id = current_subscriber_id() -- Agent
    OR
    (auth.jwt() ->> 'email' = 'superadmin@ecafleet.com') -- Superadmin
  );

DROP POLICY IF EXISTS "Public read subscribers" ON subscribers;
CREATE POLICY "Public read subscribers" ON subscribers
  FOR SELECT USING (true);

-- 2. Staff Members
-- Subscriber can see all. Agent can only see themselves.
DROP POLICY IF EXISTS "Staff members access" ON staff_members;
CREATE POLICY "Staff members access" ON staff_members 
  FOR ALL USING (
    auth.uid() = subscriber_id -- Subscriber
    OR 
    designated_uid = auth.uid()::text -- Agent (can see/update self)
  );

-- 3. Cars
-- Subscriber can see all. Agent can see all cars of their company (needed for fleet/calendar).
DROP POLICY IF EXISTS "Cars access" ON cars;
CREATE POLICY "Cars access" ON cars 
  FOR ALL USING (
    auth.uid() = subscriber_id -- Subscriber
    OR
    subscriber_id = current_subscriber_id() -- Agent
  );

-- 4. Members (Customers)
-- Subscriber can see all. Agent can only see members where they are the assigned staff.
DROP POLICY IF EXISTS "Members access" ON members;
CREATE POLICY "Members access" ON members 
  FOR ALL USING (
    auth.uid() = subscriber_id -- Subscriber
    OR 
    (EXISTS (SELECT 1 FROM staff_members WHERE id = members.staff_id AND designated_uid = auth.uid()::text) AND subscriber_id = current_subscriber_id()) -- Agent
  );

-- 5. Bookings
-- Subscriber can see all. Agent can see all for company, but only modify their own.
DROP POLICY IF EXISTS "Bookings view access" ON bookings;
CREATE POLICY "Bookings view access" ON bookings 
  FOR SELECT USING (
    auth.uid() = subscriber_id -- Subscriber
    OR 
    subscriber_id = current_subscriber_id() -- Agent
  );

DROP POLICY IF EXISTS "Bookings modify access" ON bookings;
CREATE POLICY "Bookings modify access" ON bookings 
  FOR ALL USING (
    auth.uid() = subscriber_id -- Subscriber
    OR 
    (agent_id = auth.uid() AND subscriber_id = current_subscriber_id()) -- Agent
  );

-- 6. Agreements
-- Subscriber can see all. Agent can only see their own agreements.
-- Public can read and update pending agreements for signing.
DROP POLICY IF EXISTS "Agreements access" ON agreements;
CREATE POLICY "Agreements access" ON agreements 
  FOR ALL USING (
    auth.uid() = subscriber_id -- Subscriber
    OR 
    (agent_id = auth.uid() AND subscriber_id = current_subscriber_id()) -- Agent
  );

DROP POLICY IF EXISTS "Public read agreements" ON agreements;
CREATE POLICY "Public read agreements" ON agreements
  FOR SELECT USING (status IN ('pending', 'signed', 'completed'));

DROP POLICY IF EXISTS "Public sign pending agreements" ON agreements;
CREATE POLICY "Public sign pending agreements" ON agreements
  FOR UPDATE USING (status = 'pending') WITH CHECK (status IN ('pending', 'signed'));

-- 7. Digital Forms
-- Subscriber can see all. Agent can only see their own forms.
DROP POLICY IF EXISTS "Digital forms access" ON digital_forms;
CREATE POLICY "Digital forms access" ON digital_forms 
  FOR ALL USING (
    auth.uid() = subscriber_id -- Subscriber
    OR 
    (agent_id = auth.uid() AND subscriber_id = current_subscriber_id()) -- Agent
  );

DROP POLICY IF EXISTS "Public read digital forms" ON digital_forms;
CREATE POLICY "Public read digital forms" ON digital_forms
  FOR SELECT USING (status IN ('pending', 'signed', 'completed'));

DROP POLICY IF EXISTS "Public sign pending digital forms" ON digital_forms;
CREATE POLICY "Public sign pending digital forms" ON digital_forms
  FOR UPDATE USING (status = 'pending') WITH CHECK (status IN ('pending', 'signed'));

-- 8. Expenses
-- Subscriber can see all. Agent can see expenses for cars they are managing? 
-- The user said "In every other module (Forms, Calendar, Fleet), they can ONLY query records where agent_id == auth.uid()."
-- Expenses don't have agent_id. I'll restrict to Subscriber only for now as it's "Business Dashboard" related.
DROP POLICY IF EXISTS "Expenses access" ON expenses;
CREATE POLICY "Expenses access" ON expenses 
  FOR ALL USING (auth.uid() = subscriber_id);

-- 9. Logs
-- Subscriber can see all. Agent can only see their own logs.
DROP POLICY IF EXISTS "Logs access" ON logs;
CREATE POLICY "Logs access" ON logs 
  FOR ALL USING (
    auth.uid() = subscriber_id -- Subscriber
    OR 
    (auth.uid() = user_id AND current_subscriber_id() = subscriber_id) -- Agent
  );

-- 10. Handover Records
-- Subscriber can see all. Agent can only see records for their own bookings.
DROP POLICY IF EXISTS "Handover records access" ON handover_records;
CREATE POLICY "Handover records access" ON handover_records 
  FOR ALL USING (
    auth.uid() = subscriber_id -- Subscriber
    OR 
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = handover_records.booking_id 
      AND bookings.agent_id = auth.uid()
    ) -- Agent
  );

-- 11. Customers (CRM)
DROP POLICY IF EXISTS "Customers access" ON customers;
CREATE POLICY "Customers access" ON customers 
  FOR ALL USING (
    auth.uid() = subscriber_id -- Subscriber
    OR 
    subscriber_id = current_subscriber_id() -- Agent
  );

-- 12. Marketing Events
DROP POLICY IF EXISTS "Marketing events access" ON marketing_events;
CREATE POLICY "Marketing events access" ON marketing_events 
  FOR ALL USING (
    auth.uid() = subscriber_id -- Subscriber
    OR 
    subscriber_id = current_subscriber_id() -- Agent
  );

-- Trigger to sync staff_members to members (Calendar Fleet Members)
CREATE OR REPLACE FUNCTION sync_staff_to_member()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if member already exists for this staff
    IF NOT EXISTS (SELECT 1 FROM members WHERE staff_id = NEW.id) THEN
        INSERT INTO members (name, color, subscriber_id, staff_id)
        VALUES (NEW.name, 'bg-blue-600', NEW.subscriber_id, NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_staff_to_member ON staff_members;
CREATE TRIGGER tr_sync_staff_to_member
AFTER INSERT ON staff_members
FOR EACH ROW
EXECUTE FUNCTION sync_staff_to_member();

-- Trigger to automatically create/link customer on agreement insert
CREATE OR REPLACE FUNCTION sync_agreement_to_customer()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_id UUID;
BEGIN
    -- Try to find existing customer by IC/Passport within the same subscriber
    SELECT id INTO v_customer_id 
    FROM customers 
    WHERE ic_passport = NEW.identity_number 
    AND subscriber_id = NEW.subscriber_id 
    LIMIT 1;

    -- If not found, create new customer
    IF v_customer_id IS NULL AND NEW.identity_number IS NOT NULL THEN
        INSERT INTO customers (subscriber_id, full_name, phone_number, ic_passport)
        VALUES (NEW.subscriber_id, NEW.customer_name, NEW.customer_phone, NEW.identity_number)
        RETURNING id INTO v_customer_id;
    END IF;

    -- Update the agreement with the customer_id
    NEW.customer_id := v_customer_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_agreement_to_customer ON agreements;
CREATE TRIGGER tr_sync_agreement_to_customer
BEFORE INSERT OR UPDATE OF identity_number ON agreements
FOR EACH ROW
EXECUTE FUNCTION sync_agreement_to_customer();

-- Same for digital forms
DROP TRIGGER IF EXISTS tr_sync_digital_form_to_customer ON digital_forms;
CREATE TRIGGER tr_sync_digital_form_to_customer
BEFORE INSERT OR UPDATE OF identity_number ON digital_forms
FOR EACH ROW
EXECUTE FUNCTION sync_agreement_to_customer();

-- CRM View with Data Isolation Guardrail
CREATE OR REPLACE VIEW customer_crm_view AS
SELECT 
    c.id,
    c.subscriber_id,
    c.full_name,
    c.phone_number,
    c.ic_passport,
    c.billing_address,
    c.emergency_contact_name,
    c.emergency_contact_relation,
    (
        SELECT COUNT(*) 
        FROM agreements a 
        WHERE a.customer_id = c.id 
        AND a.subscriber_id = c.subscriber_id
    ) as total_bookings,
    (
        SELECT MAX(a.end_date) 
        FROM agreements a 
        WHERE a.customer_id = c.id 
        AND a.subscriber_id = c.subscriber_id
    ) as last_rental_date,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM agreements a 
            WHERE a.customer_id = c.id 
            AND a.status = 'Ongoing' 
            AND a.subscriber_id = c.subscriber_id
        ) THEN 'Active'
        WHEN (
            SELECT COUNT(*) 
            FROM agreements a 
            WHERE a.customer_id = c.id 
            AND a.subscriber_id = c.subscriber_id
        ) > 1 THEN 'Repeat'
        ELSE 'New'
    END as status
FROM customers c;

-- ===============================================================
-- SMART LOGIN DETECTION RPC
-- ===============================================================
CREATE OR REPLACE FUNCTION verify_login_uid(p_uid TEXT)
RETURNS JSON AS $$
DECLARE
  v_company subscribers%ROWTYPE;
  v_staff staff_members%ROWTYPE;
BEGIN
  IF p_uid = 'superadmin' THEN
    RETURN json_build_object('role', 'superadmin');
  END IF;

  -- Check if it's a company (Subscriber)
  -- We assume the company name/code is used as the UID
  SELECT * INTO v_company FROM subscribers WHERE name ILIKE p_uid LIMIT 1;
  IF FOUND THEN
    RETURN json_build_object(
      'role', 'subscriber', 
      'id', v_company.id, 
      'tier', v_company.tier, 
      'company_code', v_company.name
    );
  END IF;

  -- Check if it's a staff member
  SELECT * INTO v_staff FROM staff_members WHERE designated_uid ILIKE p_uid LIMIT 1;
  IF FOUND THEN
    -- Get the company code to allow Supabase Auth login behind the scenes
    SELECT * INTO v_company FROM subscribers WHERE id = v_staff.subscriber_id LIMIT 1;
    RETURN json_build_object(
      'role', 'staff', 
      'subscriber_id', v_staff.subscriber_id, 
      'company_code', v_company.name,
      'staff_id', v_staff.id, 
      'staff_name', v_staff.name, 
      'designated_uid', v_staff.designated_uid,
      'pin_hash', v_staff.pin_hash,
      'tier', v_company.tier
    );
  END IF;

  RETURN json_build_object('role', 'unknown');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Subscriber Payments (for Cash-Basis Revenue Tracking)
CREATE TABLE IF NOT EXISTS subscriber_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tier TEXT NOT NULL,
  months_added INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to record payments automatically
CREATE OR REPLACE FUNCTION record_subscriber_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_tier_price DECIMAL(10, 2);
  v_months_diff INTEGER;
  v_base_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Determine tier price
  IF NEW.tier = 'Tier 1' THEN v_tier_price := 150;
  ELSIF NEW.tier = 'Tier 2' THEN v_tier_price := 200;
  ELSIF NEW.tier = 'Tier 3' THEN v_tier_price := 399;
  ELSE v_tier_price := 0;
  END IF;

  -- If it's a trial or no expiry, no revenue contribution
  IF NEW.is_trial = TRUE OR NEW.expiry_date IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate months added
  IF (TG_OP = 'INSERT') THEN
    -- For new subscribers, months is difference between start and expiry
    -- We use a simple month difference calculation
    v_months_diff := (EXTRACT(YEAR FROM NEW.expiry_date) - EXTRACT(YEAR FROM NEW.subscription_start_date)) * 12 +
                     (EXTRACT(MONTH FROM NEW.expiry_date) - EXTRACT(MONTH FROM NEW.subscription_start_date));
    
    -- If the day of month is greater, it counts as another month
    IF EXTRACT(DAY FROM NEW.expiry_date) > EXTRACT(DAY FROM NEW.subscription_start_date) THEN
        v_months_diff := v_months_diff + 1;
    END IF;
    
    -- Ensure at least 1 month if expiry is set
    IF v_months_diff <= 0 AND NEW.expiry_date > NEW.subscription_start_date THEN
        v_months_diff := 1;
    END IF;

    IF v_months_diff > 0 THEN
      INSERT INTO subscriber_payments (subscriber_id, amount, tier, months_added, payment_date)
      VALUES (NEW.id, v_months_diff * v_tier_price, NEW.tier, v_months_diff, NEW.subscription_start_date);
    END IF;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Only record if expiry_date was increased
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

-- Drop trigger if exists to avoid errors on re-run
DROP TRIGGER IF EXISTS trg_record_subscriber_payment ON subscribers;
CREATE TRIGGER trg_record_subscriber_payment
AFTER INSERT OR UPDATE OF expiry_date, tier, is_trial ON subscribers
FOR EACH ROW EXECUTE FUNCTION record_subscriber_payment();

-- 12. SaaS Revenue Dashboard View (Cash-Basis)
DROP VIEW IF EXISTS saas_revenue_dashboard;
CREATE OR REPLACE VIEW saas_revenue_dashboard AS
WITH RECURSIVE months(date) AS (
  SELECT DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months')
  UNION ALL
  SELECT date + INTERVAL '1 month' FROM months WHERE date < DATE_TRUNC('month', CURRENT_DATE + INTERVAL '10 months')
)
SELECT 
    TO_CHAR(m.date, 'Mon YYYY') as month,
    COALESCE((
      SELECT SUM(p.amount) 
      FROM subscriber_payments p 
      WHERE DATE_TRUNC('month', p.payment_date) = m.date
    ), 0) as distributed_revenue,
    (
      SELECT COUNT(*) 
      FROM subscribers s 
      WHERE s.status = 'ACTIVE' 
      AND (s.expiry_date >= m.date OR s.expiry_date IS NULL)
      AND DATE_TRUNC('month', s.subscription_start_date) <= m.date
    ) as active_subscribers
FROM months m
ORDER BY m.date ASC;

-- Initial Migration: Populate payments for existing subscribers
INSERT INTO subscriber_payments (subscriber_id, amount, tier, months_added, payment_date)
SELECT 
  id, 
  CASE 
    WHEN tier = 'Tier 1' THEN 150 
    WHEN tier = 'Tier 2' THEN 200 
    WHEN tier = 'Tier 3' THEN 399 
    ELSE 0 
  END * GREATEST(1, (EXTRACT(YEAR FROM expiry_date) - EXTRACT(YEAR FROM subscription_start_date)) * 12 + (EXTRACT(MONTH FROM expiry_date) - EXTRACT(MONTH FROM subscription_start_date))),
  tier,
  GREATEST(1, (EXTRACT(YEAR FROM expiry_date) - EXTRACT(YEAR FROM subscription_start_date)) * 12 + (EXTRACT(MONTH FROM expiry_date) - EXTRACT(MONTH FROM subscription_start_date))),
  subscription_start_date
FROM subscribers
WHERE is_trial = FALSE AND expiry_date IS NOT NULL
ON CONFLICT DO NOTHING;

-- 13. Initial Migration: Populate customers from existing agreements
INSERT INTO customers (subscriber_id, full_name, phone_number, ic_passport)
SELECT DISTINCT ON (subscriber_id, identity_number) 
    subscriber_id, customer_name, customer_phone, identity_number
FROM agreements
WHERE identity_number IS NOT NULL
ON CONFLICT (subscriber_id, ic_passport) DO NOTHING;

-- Update existing agreements with customer_id
UPDATE agreements a
SET customer_id = c.id
FROM customers c
WHERE a.identity_number = c.ic_passport 
AND a.subscriber_id = c.subscriber_id;

-- Update existing digital forms with customer_id
UPDATE digital_forms f
SET customer_id = c.id
FROM customers c
WHERE f.identity_number = c.ic_passport 
AND f.subscriber_id = c.subscriber_id;
