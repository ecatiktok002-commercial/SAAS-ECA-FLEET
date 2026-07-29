-- 1. Add missing properties to the staff table
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS color text DEFAULT 'bg-blue-500',
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS identity_number text,
ADD COLUMN IF NOT EXISTS billing_address text,
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_relation text,
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS pin_hash text;

-- 2. Migrate data from members to staff
UPDATE staff s
SET 
  color = COALESCE(m.color, 'bg-blue-500'),
  email = m.email,
  phone = m.phone,
  identity_number = m.identity_number,
  billing_address = m.billing_address,
  emergency_contact_name = m.emergency_contact_name,
  emergency_contact_relation = m.emergency_contact_relation
FROM members m
WHERE s.id = m.staff_id;

-- 3. Remap all bookings to point directly to the staff.id instead of members.id
UPDATE bookings b
SET member_id = m.staff_id
FROM members m
WHERE b.member_id = m.id;
