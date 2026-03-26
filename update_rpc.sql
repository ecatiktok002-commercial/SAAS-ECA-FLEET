CREATE OR REPLACE FUNCTION current_subscriber_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    -- 1. Check if user is a subscriber (by ID or by matching email prefix to name)
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
