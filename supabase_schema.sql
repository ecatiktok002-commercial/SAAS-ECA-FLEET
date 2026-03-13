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
--
-- ALTER TABLE agreements ADD COLUMN IF NOT EXISTS total_price NUMERIC DEFAULT 0;
-- ALTER TABLE agreements ADD COLUMN IF NOT EXISTS deposit NUMERIC DEFAULT 0;
-- ALTER TABLE agreements ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 1;
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

-- 1. Companies Table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY, -- Matches Auth UID
  name TEXT NOT NULL,
  tier TEXT DEFAULT 'tier_1',
  is_active BOOLEAN DEFAULT TRUE,
  expiry_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Staff Members
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  designated_uid TEXT NOT NULL,
  role TEXT DEFAULT 'staff',
  pin_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subscriber_id, designated_uid)
);

-- 3. Cars Table
CREATE TABLE IF NOT EXISTS cars (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
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
  subscriber_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
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
  subscriber_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  agent_id UUID, -- The staff member who created it
  start TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  total_price NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Agreements (Sales)
CREATE TABLE IF NOT EXISTS agreements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
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
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Digital Forms
CREATE TABLE IF NOT EXISTS digital_forms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
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
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  car_id UUID REFERENCES cars(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Logs
CREATE TABLE IF NOT EXISTS logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID,
  staff_name TEXT,
  action TEXT NOT NULL,
  details TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Handover Records
CREATE TABLE IF NOT EXISTS handover_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  mileage INTEGER,
  fuel_level INTEGER,
  notes TEXT,
  photos_url TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================================
-- RLS POLICIES
-- ===============================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_records ENABLE ROW LEVEL SECURITY;

-- Helper to check if user is a Subscriber (Company Owner)
-- In this system, the company ID matches the Auth UID of the owner
CREATE OR REPLACE FUNCTION is_subscriber(check_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- A user is a subscriber if their auth.uid() matches the company id
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
  -- 1. Check if user is a subscriber (their UID is a company ID)
  SELECT id INTO comp_id FROM companies WHERE id = auth.uid();
  IF comp_id IS NOT NULL THEN
    RETURN comp_id;
  END IF;
  
  -- 2. Check if user is an agent (linked via designated_uid)
  -- We use designated_uid to match the auth.uid()
  SELECT subscriber_id INTO comp_id FROM staff_members WHERE designated_uid = auth.uid()::text LIMIT 1;
  RETURN comp_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Companies
DROP POLICY IF EXISTS "Companies access" ON companies;
CREATE POLICY "Companies access" ON companies 
  FOR ALL USING (
    auth.uid() = id -- Subscriber
    OR 
    id = current_subscriber_id() -- Agent
    OR
    (auth.jwt() ->> 'email' = 'superadmin@ecafleet.com') -- Superadmin
  );

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
DROP POLICY IF EXISTS "Agreements access" ON agreements;
CREATE POLICY "Agreements access" ON agreements 
  FOR ALL USING (
    auth.uid() = subscriber_id -- Subscriber
    OR 
    (agent_id = auth.uid() AND subscriber_id = current_subscriber_id()) -- Agent
  );

-- 7. Digital Forms
-- Subscriber can see all. Agent can only see their own forms.
DROP POLICY IF EXISTS "Digital forms access" ON digital_forms;
CREATE POLICY "Digital forms access" ON digital_forms 
  FOR ALL USING (
    auth.uid() = subscriber_id -- Subscriber
    OR 
    (agent_id = auth.uid() AND subscriber_id = current_subscriber_id()) -- Agent
  );

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

-- ===============================================================
-- SMART LOGIN DETECTION RPC
-- ===============================================================
CREATE OR REPLACE FUNCTION verify_login_uid(p_uid TEXT)
RETURNS JSON AS $$
DECLARE
  v_company companies%ROWTYPE;
  v_staff staff_members%ROWTYPE;
BEGIN
  IF p_uid = 'superadmin' THEN
    RETURN json_build_object('role', 'superadmin');
  END IF;

  -- Check if it's a company (Subscriber)
  -- We assume the company name/code is used as the UID
  SELECT * INTO v_company FROM companies WHERE name ILIKE p_uid LIMIT 1;
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
    SELECT * INTO v_company FROM companies WHERE id = v_staff.subscriber_id LIMIT 1;
    RETURN json_build_object(
      'role', 'staff', 
      'subscriber_id', v_staff.subscriber_id, 
      'company_code', v_company.name,
      'staff_id', v_staff.id, 
      'staff_name', v_staff.name, 
      'pin_hash', v_staff.pin_hash,
      'tier', v_company.tier
    );
  END IF;

  RETURN json_build_object('role', 'unknown');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
