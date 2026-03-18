import { supabase } from './supabase';
import { format, addDays, parseISO } from 'date-fns';

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
    .or('status.neq.cancelled,status.is.null');

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
  let orphanedBookings = (bookings || []).filter(booking => 
    !uniqueAgreements.some(a => a.booking_id === booking.id)
  );

  // 5. Find orphaned agreements: Agreements created this month that do not have a booking_id
  let orphanedAgreements = (recentAgreements || []).filter(a => !a.booking_id);

  // 6. Heuristic Auto-Matching (The DNA Check)
  for (let i = orphanedAgreements.length - 1; i >= 0; i--) {
    const agreement = orphanedAgreements[i];
    
    // Find a matching booking
    const matchIndex = orphanedBookings.findIndex(booking => {
      try {
        const d = new Date(booking.start);
        const startDate = format(d, 'yyyy-MM-dd');
        const time = format(d, 'HH:mm');
        const duration = booking.duration;
        const endDate = format(addDays(parseISO(startDate), duration), 'yyyy-MM-dd');

        // Check DNA
        const isStartDateMatch = agreement.start_date === startDate;
        const isEndDateMatch = agreement.end_date === endDate;
        const isPickupTimeMatch = agreement.pickup_time === time;
        const isReturnTimeMatch = agreement.return_time === time;
        const isSubscriberMatch = agreement.subscriber_id === subscriberId && booking.subscriber_id === subscriberId;

        return isStartDateMatch && isEndDateMatch && isPickupTimeMatch && isReturnTimeMatch && isSubscriberMatch;
      } catch (e) {
        return false;
      }
    });

    if (matchIndex !== -1) {
      const matchedBooking = orphanedBookings[matchIndex];
      
      // Permanent Tagging (Database Update)
      const { error: updateError } = await supabase
        .from('agreements')
        .update({ booking_id: matchedBooking.id })
        .eq('id', agreement.id)
        .eq('subscriber_id', subscriberId); // Safety check

      if (!updateError) {
        console.log(`Auto-matched agreement ${agreement.id} to booking ${matchedBooking.id}`);
        // Remove from orphan queues
        orphanedAgreements.splice(i, 1);
        orphanedBookings.splice(matchIndex, 1);
      } else {
        console.error(`Failed to auto-match agreement ${agreement.id}:`, updateError);
      }
    }
  }

  return {
    orphanedAgreements,
    orphanedBookings
  };
};
