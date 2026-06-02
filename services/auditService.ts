import { supabase } from './supabase';
import { format, addDays, parseISO, isValid, differenceInDays } from 'date-fns';
import { apiService } from './apiService';
import { formatInMYT } from '../utils/dateUtils';

/**
 * Executes the Phase 1 Matchy Scan for a specific month and subscriber.
 * Strictly enforces Multi-Tenant Data Isolation.
 */
export const runMatchyScan = async (subscriberId: string, monthStartDate: string, monthEndDate: string) => {
  // 0. Integrity Check: Unlink agreements that no longer legitimately match their bookings
  // This handles cases where a calendar booking was extended but the form wasn't updated
  const { data: linkedCheck } = await supabase
    .from('agreements')
    .select('id, duration_days, start_date, car_plate_number, booking_id, bookings(duration_days, duration, start_date, pickup_datetime, cars(plate, plate_number))')
    .eq('subscriber_id', subscriberId)
    .not('booking_id', 'is', null);

  if (linkedCheck && linkedCheck.length > 0) {
    const invalidLinks = linkedCheck.filter((a: any) => {
      const b = a.bookings;
      if (!b) return true; // Booking deleted

      // Removed strict date/duration/plate mismatch unlinking.
      // If a booking is updated to a different duration or plate, it should be marked as "Discrepancy" in the UI
      // rather than forcefully unlinked which frustrates the user and breaks manual linking.
      return false;
    });

    if (invalidLinks.length > 0) {
      // Chunk the updates to avoid URL limits
      const invalidIds = invalidLinks.map(a => a.id);
      for (let i = 0; i < invalidIds.length; i += 100) {
        const chunk = invalidIds.slice(i, i + 100);
        await supabase
          .from('agreements')
          .update({ 
            booking_id: null,
            payout_status: 'pending' // Reset payout status
          })
          .in('id', chunk);
      }
      console.log(`[MatchyScan] Unlinked ${invalidIds.length} previously matched records due to broken criteria.`);
    }
  }

  // 1. Call the RPC to do the heuristic match
  const { data: rpcData, error: rpcError } = await supabase.rpc('run_heuristic_match', { target_subscriber_id: subscriberId });
  let matchCount = (rpcData as any)?.[0]?.matched_count || 0;
  
  if (rpcError) {
    console.error("RPC Error in run_heuristic_match:", rpcError);
  }

  // 2. Fetch all active bookings for the month
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*, cars(plate, plate_number)')
    .eq('subscriber_id', subscriberId)
    .gte('pickup_datetime', `${monthStartDate}T00:00:00.000Z`)
    .lte('pickup_datetime', `${monthEndDate}T23:59:59.999Z`)
    .or('status.neq.cancelled,status.is.null');

  if (bookingsError) {
    throw new Error(`Error fetching bookings: ${bookingsError.message}`);
  }

  // 3. Fetch all unlinked agreements (to find orphaned agreements and attempt fallback matches)
  const { data: recentAgreements, error: recentAgreementsError } = await supabase
    .from('agreements')
    // FIX: Explicitly select lightweight columns
    .select('id, booking_id, subscriber_id, start_date, pickup_time, duration_days, car_plate_number, customer_name, reference_number, agent_name, total_price, status, payout_status')
    .eq('subscriber_id', subscriberId)
    .is('booking_id', null);

  if (recentAgreementsError) {
    throw new Error(`Error fetching agreements: ${recentAgreementsError.message}`);
  }

  const normalizeDate = (d?: string | null) => {
    if (!d) return null;
    if (d.includes('/')) {
      const parts = d.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return d;
  };

  // 4. Client-side Heuristic Match Fallback
  const unlinkedAgreements = (recentAgreements || []);
  const unlinkedBookings = (bookings || []).filter(b => {
    // Check if any agreement is already linked to this booking
    // This is a bit expensive but necessary for robustness
    return true; // We'll filter more precisely in the loop
  });

  if (unlinkedAgreements.length > 0 && (bookings || []).length > 0) {
    for (const agreement of unlinkedAgreements) {
      // Find a matching booking
      const matchingBooking = (bookings || []).find(b => {
        // Already linked check
        const isAlreadyLinked = (recentAgreements || []).some(ra => ra.booking_id === b.id && ra.id !== agreement.id);
        if (isAlreadyLinked) return false;

        const bStartDate = b.start_date || (b.pickup_datetime ? formatInMYT(b.pickup_datetime, 'yyyy-MM-dd') : null);
        const bDuration = b.duration_days ?? b.duration;
        
        const normalizePlate = (p?: string | null) => (p || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

        const normalizeDate = (d?: string | null) => {
          if (!d) return null;
          // If it's DD/MM/YYYY, convert to YYYY-MM-DD
          if (d.includes('/')) {
            const parts = d.split('/');
            if (parts.length === 3) {
              return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
          return d;
        };

        const checkDateMatch = (d1?: string | null, d2?: string | null) => {
          const pd1 = normalizeDate(d1);
          const pd2 = normalizeDate(d2);
          if (pd1 === pd2) return true;
          if (!pd1 || !pd2) return false;
          try {
            const dt1 = new Date(pd1);
            const dt2 = new Date(pd2);
            if (isValid(dt1) && isValid(dt2)) {
              return Math.abs(differenceInDays(dt1, dt2)) <= 1;
            }
          } catch(e) {}
          return false;
        };

        const dateMatch = checkDateMatch(agreement.start_date, bStartDate);
        const durationMatch = Number(agreement.duration_days) === Number(bDuration);
        const carPlateMatch = normalizePlate(agreement.car_plate_number) === normalizePlate(b.cars?.plate) || 
                              normalizePlate(agreement.car_plate_number) === normalizePlate(b.cars?.plate_number);

        return dateMatch && durationMatch && carPlateMatch;
      });

      if (matchingBooking) {
        // Link them in the database
        const { error: linkError } = await supabase
          .from('agreements')
          .update({ 
            booking_id: matchingBooking.id,
            status: 'completed',
            payout_status: 'pending_review'
          })
          .eq('id', agreement.id);
        
        if (!linkError) {
          agreement.booking_id = matchingBooking.id;
          matchCount++;
        }
      }
    }
  }

  // 5. Fetch agreements linked to the bookings (to ensure we don't falsely flag a booking as orphaned if its agreement was created last month)
  const bookingIds = (bookings || []).map(b => b.id);
  let linkedAgreements: any[] = [];
  
  // Supabase 'in' filter can fail if the array is empty
  if (bookingIds.length > 0) {
    // Split into chunks of 100 to avoid URL length limits in Supabase
    for (let i = 0; i < bookingIds.length; i += 100) {
      const chunk = bookingIds.slice(i, i + 100);
      const { data: linked, error: linkedError } = await supabase
        .from('agreements')
        // FIX: Explicitly select lightweight columns here too
        .select('id, booking_id, subscriber_id, start_date, pickup_time, duration_days, car_plate_number, customer_name, reference_number, agent_name, total_price, status, payout_status')
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

  // 5. Find orphaned bookings: Bookings that do not have any agreement with matching booking_id
  let orphanedBookings = (bookings || []).filter(booking => 
    !uniqueAgreements.some(a => a.booking_id === booking.id)
  );

  // 6. Find orphaned agreements: Agreements whose start_date falls in the current month that do not have a booking_id
  let orphanedAgreements = (recentAgreements || []).filter(a => {
    if (a.booking_id) return false;
    const pd = normalizeDate(a.start_date);
    if (!pd) return false;
    return pd >= monthStartDate && pd <= monthEndDate;
  });

  return {
    orphanedAgreements,
    orphanedBookings,
    matchCount: matchCount || 0
  };
};

/**
 * Approves a pending amendment request for an agreement.
 * Overwrites the original agreement data and synchronizes with the linked booking.
 */
export const approveAmendment = async (agreementId: string, subscriberId: string) => {
  // 1. Fetch the agreement to get pending_changes and booking_id
  const agreement = await apiService.getAgreementById(agreementId, subscriberId);
  if (!agreement) throw new Error('Agreement not found');
  if (!agreement.has_pending_changes || !agreement.pending_changes) {
    throw new Error('No pending changes to approve');
  }

  const pendingChanges = agreement.pending_changes as any;
  const bookingId = agreement.booking_id;

  // 2. Prepare the update for the agreement
  // We overwrite the main fields with the pending changes
  const agreementUpdates = {
    ...pendingChanges,
    has_pending_changes: false,
    pending_changes: null,
    updated_at: new Date().toISOString()
  };

  // 3. Execute the update for the agreement
  await apiService.updateAgreement(agreementId, subscriberId, agreementUpdates);

  // 4. Sync with bookings table if necessary
  if (bookingId) {
    let bookingUpdates: any = {};
    
    // Check if car plate was changed
    if (pendingChanges.car_plate_number) {
      // Find the proper car_id from cars table
      const { data: carData } = await supabase
        .from('cars')
        .select('id')
        .eq('subscriber_id', subscriberId)
        .or(`plate_number.eq."${pendingChanges.car_plate_number}",plate.eq."${pendingChanges.car_plate_number}"`)
        .limit(1)
        .single();
        
      if (carData) {
        bookingUpdates.car_id = carData.id;
      }
    }

    // Check if date/time fields were changed
    const dateFields = ['start_date', 'end_date', 'pickup_time', 'return_time', 'duration_days'];
    const hasDateChanges = dateFields.some(f => f in pendingChanges);
    
    if (hasDateChanges) {
      const finalStartDate = pendingChanges.start_date || agreement.start_date;
      const finalPickupTime = (pendingChanges.pickup_time || agreement.pickup_time || '10:00').substring(0, 5);
      const finalEndDate = pendingChanges.end_date || agreement.end_date;
      const finalReturnTime = (pendingChanges.return_time || agreement.return_time || '10:00').substring(0, 5);
      
      if (finalStartDate && finalEndDate) {
        try {
          // Construct the new start and end timestamps
          const startTimestamp = parseISO(`${finalStartDate}T${finalPickupTime}:00`);
          const endTimestamp = parseISO(`${finalEndDate}T${finalReturnTime}:00`);
          
          // Calculate new duration
          const startDateObj = parseISO(finalStartDate);
          const endDateObj = parseISO(finalEndDate);
          const duration = Math.max(0, differenceInDays(endDateObj, startDateObj));
          
          if (isValid(startTimestamp) && isValid(endTimestamp)) {
             bookingUpdates.pickup_datetime = startTimestamp.toISOString();
             bookingUpdates.actual_end_time = endTimestamp.toISOString();
             bookingUpdates.duration_days = duration;
          }
        } catch (err) {
          console.error('Error calculating booking sync:', err);
        }
      }
    }
    
    if (Object.keys(bookingUpdates).length > 0) {
      const { error: bookingError } = await supabase
        .from('bookings')
        .update(bookingUpdates)
        .eq('id', bookingId);
        
      if (bookingError) {
        console.error('Booking sync failed:', bookingError);
        throw new Error(`Agreement updated but booking sync failed: ${bookingError.message}`);
      }
    }
  }

  return { success: true };
};

/**
 * Rejects a pending amendment request for an agreement.
 * Simply clears the pending changes flags.
 */
export const rejectAmendment = async (agreementId: string, subscriberId: string) => {
  const { error } = await supabase
    .from('agreements')
    .update({
      has_pending_changes: false,
      pending_changes: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', agreementId)
    .eq('subscriber_id', subscriberId);

  if (error) throw error;
  return { success: true };
};
