-- Ensure required columns exist before updating functions
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'Tier 1';
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- 1. Restore and fix verify_login_uid
CREATE OR REPLACE FUNCTION verify_login_uid(p_uid TEXT)
RETURNS JSON AS $$
DECLARE
  v_company subscribers%ROWTYPE;
  v_staff public.staff%ROWTYPE;
  v_legacy_staff public.staff_members%ROWTYPE;
BEGIN
  IF p_uid = 'superadmin' THEN
    RETURN json_build_object('role', 'superadmin');
  END IF;

  -- Step 1: The Identity Lookup
  SELECT * INTO v_staff FROM public.staff WHERE access_id ILIKE p_uid LIMIT 1;
  
  IF FOUND THEN
    IF v_staff.is_active = false THEN
      RETURN json_build_object('role', 'disabled_staff');
    END IF;

    -- We also need the real subscriber UUID for the app's internal filtering
    SELECT * INTO v_company FROM subscribers WHERE name ILIKE v_staff.subscriber_id LIMIT 1;
    
    IF NOT FOUND THEN
      RETURN json_build_object('role', 'orphaned_staff', 'message', 'Company record not found for this staff member.');
    END IF;

    RETURN json_build_object(
      'role', 'staff', 
      'subscriber_id', v_company.id, 
      'subscriber_slug', v_staff.subscriber_id, 
      'staff_id', v_staff.id, 
      'staff_name', v_staff.name, 
      'access_id', v_staff.access_id,
      'pin_code', v_staff.pin_code,
      'tier', v_company.tier,
      'brand_name', v_company.brand_name
    );
  END IF;

  -- Step 2: The Identity Lookup (Legacy Table)
  SELECT * INTO v_legacy_staff FROM public.staff_members WHERE access_id ILIKE p_uid LIMIT 1;
  
  IF FOUND THEN
    -- We also need the real subscriber UUID for the app's internal filtering
    SELECT * INTO v_company FROM subscribers WHERE id = v_legacy_staff.subscriber_id LIMIT 1;
    
    IF NOT FOUND THEN
      RETURN json_build_object('role', 'orphaned_staff', 'message', 'Company record not found for this staff member.');
    END IF;

    RETURN json_build_object(
      'role', 'staff', 
      'subscriber_id', v_company.id, 
      'subscriber_slug', v_company.name, 
      'staff_id', v_legacy_staff.id, 
      'staff_name', v_legacy_staff.name, 
      'access_id', v_legacy_staff.access_id,
      'pin_hash', v_legacy_staff.pin_hash,
      'tier', v_company.tier,
      'brand_name', v_company.brand_name
    );
  END IF;

  -- Fallback for direct subscriber login (Master Login)
  -- CRITICAL FIX: Prioritize non-Tier 1 records if there are duplicates
  SELECT * INTO v_company FROM subscribers WHERE name ILIKE p_uid ORDER BY CASE WHEN tier != 'Tier 1' THEN 0 ELSE 1 END LIMIT 1;
  IF FOUND THEN
    RETURN json_build_object(
      'role', 'subscriber', 
      'id', v_company.id, 
      'tier', v_company.tier, 
      'company_code', v_company.name,
      'brand_name', v_company.brand_name
    );
  END IF;

  RETURN json_build_object(
    'role', 'unknown',
    'message', 'UID ' || p_uid || ' not found in staff, legacy staff, or subscribers.',
    'debug_info', json_build_object(
      'p_uid', p_uid,
      'timestamp', now()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Restore and fix current_subscriber_id
CREATE OR REPLACE FUNCTION current_subscriber_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    -- 1. Check if user is a subscriber (by ID or by matching email prefix to name)
    -- CRITICAL FIX: Prioritize non-Tier 1 records if there are duplicates
    (SELECT id FROM public.subscribers 
     WHERE id = auth.uid() 
        OR name ILIKE (SELECT SPLIT_PART(email, '@', 1) FROM auth.users WHERE id = auth.uid())
     ORDER BY CASE WHEN tier != 'Tier 1' THEN 0 ELSE 1 END
     LIMIT 1)
    UNION ALL
    -- 2. Check if user is an agent in staff_members
    SELECT subscriber_id FROM public.staff_members 
    WHERE id = auth.uid() OR access_id = auth.uid()::text 
    UNION ALL
    -- 3. Fallback: check staff table (slug-based)
    SELECT s.id 
    FROM public.staff st
    JOIN public.subscribers s ON s.name ILIKE st.subscriber_id
    WHERE st.id = auth.uid() OR st.access_id = auth.uid()::text
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
