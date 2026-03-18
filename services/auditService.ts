import { supabase } from './supabase';

/**
 * Executes the Phase 1 Matchy Scan for a specific month and subscriber.
 * Strictly enforces Multi-Tenant Data Isolation.
 */
export const runMatchyScan = async (subscriberId: string, monthStartDate: string, monthEndDate: string) => {
  
  // 1. Fetch all active bookings for the month
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*, cars(plate)')
    .eq('subscriber_id', subscriberId)
    .gte('start', monthStartDate)
    .lte('start', monthEndDate)
    .neq('status', 'cancelled');

  if (bookingsError) {
    throw new Error(`Error fetching bookings: ${bookingsError.message}`);
  }

  // 2. Fetch agreements created in this month (to find orphaned agreements)
  const { data: recentAgreements, error: recentAgreementsError } = await supabase
    .from('agreements')
    .select('*')
    .eq('subscriber_id', subscriberId)
    .gte('created_at', monthStartDate)
    .lte('created_at', monthEndDate);

  if (recentAgreementsError) {
    throw new Error(`Error fetching agreements: ${recentAgreementsError.message}`);
  }

  // 3. Fetch agreements linked to the bookings (to ensure we don't falsely flag a booking as orphaned if its agreement was created last month)
  const bookingIds = (bookings || []).map(b => b.id);
  let linkedAgreements: any[] = [];
  
  // Supabase 'in' filter can fail if the array is empty
  if (bookingIds.length > 0) {
    // Split into chunks of 100 to avoid URL length limits in Supabase
    for (let i = 0; i < bookingIds.length; i += 100) {
      const chunk = bookingIds.slice(i, i + 100);
      const { data: linked, error: linkedError } = await supabase
        .from('agreements')
        .select('*')
        .eq('subscriber_id', subscriberId)
        .in('booking_id', chunk);
        
      if (!linkedError && linked) {
        linkedAgreements = [...linkedAgreements, ...linked];
      }
    }
  }

  // Combine and deduplicate agreements
  const allRelevantAgreements = [...(recentAgreements || []), ...linkedAgreements];
  const uniqueAgreements = Array.from(new Map(allRelevantAgreements.map(a => [a.id, a])).values());

  // 4. Find orphaned bookings: Bookings that do not have any agreement with matching booking_id
  const orphanedBookings = (bookings || []).filter(booking => 
    !uniqueAgreements.some(a => a.booking_id === booking.id)
  );

  // 5. Find orphaned agreements: Agreements created this month that do not have a booking_id
  const orphanedAgreements = (recentAgreements || []).filter(a => !a.booking_id);

  return {
    orphanedAgreements,
    orphanedBookings
  };
};
