-- ===============================================================
-- SUPABASE FLEET TRACK SCHEMA
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ===============================================================

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
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'staff',
  pin_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- 3. Cars Table
CREATE TABLE IF NOT EXISTS cars (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
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
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  color TEXT DEFAULT 'bg-blue-500',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  start TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  total_price NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Agreements (Sales)
CREATE TABLE IF NOT EXISTS agreements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Digital Forms
CREATE TABLE IF NOT EXISTS digital_forms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
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
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID,
  staff_name TEXT,
  action TEXT NOT NULL,
  details TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Handover Records
CREATE TABLE IF NOT EXISTS handover_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
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

-- Explicit Policies using text casting for maximum compatibility
CREATE POLICY "Companies can view themselves" ON companies FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Company access staff_members" ON staff_members FOR ALL USING (auth.uid()::text = company_id::text);
CREATE POLICY "Company access cars" ON cars FOR ALL USING (auth.uid()::text = company_id::text);
CREATE POLICY "Company access members" ON members FOR ALL USING (auth.uid()::text = company_id::text);
CREATE POLICY "Company access bookings" ON bookings FOR ALL USING (auth.uid()::text = company_id::text);
CREATE POLICY "Company access agreements" ON agreements FOR ALL USING (auth.uid()::text = company_id::text);
CREATE POLICY "Company access digital_forms" ON digital_forms FOR ALL USING (auth.uid()::text = company_id::text);
CREATE POLICY "Company access expenses" ON expenses FOR ALL USING (auth.uid()::text = company_id::text);
CREATE POLICY "Company access logs" ON logs FOR ALL USING (auth.uid()::text = company_id::text);
CREATE POLICY "Company access handover_records" ON handover_records FOR ALL USING (auth.uid()::text = company_id::text);
