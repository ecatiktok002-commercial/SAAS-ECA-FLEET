CREATE OR REPLACE FUNCTION public.run_heuristic_match(target_subscriber_id uuid)
 RETURNS TABLE(matched_count integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    updated_rows INT;
BEGIN
    UPDATE public.agreements a
    SET booking_id = b.id
    FROM public.bookings b
    -- We JOIN the cars table so the system can read the physical car plate
    JOIN public.cars c ON b.car_id = c.id
    WHERE a.subscriber_id = target_subscriber_id
      AND b.subscriber_id = target_subscriber_id
      AND a.booking_id IS NULL 
      -- 1. Exact Date Match
      AND a.start_date = COALESCE(b.start_date, (b.pickup_datetime AT TIME ZONE 'Asia/Kuala_Lumpur')::date)
      -- 2. Exact Duration Match
      AND a.duration_days = COALESCE(b.duration_days, b.duration)
      -- 3. Exact Car Plate Match (The Ultimate Unique Differentiator)
      AND (
        REPLACE(LOWER(a.car_plate_number), ' ', '') = REPLACE(LOWER(c.plate), ' ', '') OR 
        REPLACE(LOWER(a.car_plate_number), ' ', '') = REPLACE(LOWER(c.plate_number), ' ', '')
      );

    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    RETURN QUERY SELECT updated_rows;
END;
$function$;
