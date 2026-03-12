-- Create staff_members table
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  pin_hash TEXT, -- Stores the hashed 4-digit PIN
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Enable RLS
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

-- Policy for reading staff members (allow if user belongs to company)
CREATE POLICY "Users can view staff members of their company" ON staff_members
  FOR SELECT
  USING (auth.uid() = company_id);

-- Policy for inserting staff members
CREATE POLICY "Users can add staff members to their company" ON staff_members
  FOR INSERT
  WITH CHECK (auth.uid() = company_id);

-- Policy for updating staff members
CREATE POLICY "Users can update staff members of their company" ON staff_members
  FOR UPDATE
  USING (auth.uid() = company_id);

-- Policy for deleting staff members
CREATE POLICY "Users can delete staff members of their company" ON staff_members
  FOR DELETE
  USING (auth.uid() = company_id);
