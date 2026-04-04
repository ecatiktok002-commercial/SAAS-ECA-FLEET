-- ============================================================================
-- FIX FOR PUBLIC HANDOVER LINKS (CUSTOMER SELF-SERVICE)
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- 1. Allow anonymous users to insert into handover_records
DROP POLICY IF EXISTS "Allow public insert for handover records" ON handover_records;
CREATE POLICY "Allow public insert for handover records" ON handover_records
  FOR INSERT
  WITH CHECK (true);

-- 2. Create a trigger to automatically update car mileage securely (bypassing RLS)
CREATE OR REPLACE FUNCTION update_car_mileage_on_handover()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mileage IS NOT NULL AND NEW.mileage > 0 THEN
    UPDATE cars
    SET current_mileage = NEW.mileage
    WHERE id = NEW.car_id
      AND subscriber_id = NEW.subscriber_id
      AND (current_mileage IS NULL OR NEW.mileage > current_mileage);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_car_mileage_on_handover ON handover_records;
CREATE TRIGGER trigger_update_car_mileage_on_handover
AFTER INSERT ON handover_records
FOR EACH ROW
EXECUTE FUNCTION update_car_mileage_on_handover();

-- 3. Ensure the handover_images bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('handover_images', 'handover_images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 4. Allow anonymous users to upload photos to the handover_images bucket
DROP POLICY IF EXISTS "Allow public uploads to handover_images" ON storage.objects;
CREATE POLICY "Allow public uploads to handover_images" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'handover_images'
);

-- 5. Allow anonymous users to update photos (in case of retries/overwrites)
DROP POLICY IF EXISTS "Allow public updates to handover_images" ON storage.objects;
CREATE POLICY "Allow public updates to handover_images" 
ON storage.objects FOR UPDATE
WITH CHECK (
  bucket_id = 'handover_images'
);

-- 6. Allow anonymous users to read photos (required for the form's preview to work)
DROP POLICY IF EXISTS "Allow public reads for handover_images" ON storage.objects;
CREATE POLICY "Allow public reads for handover_images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'handover_images'
);
