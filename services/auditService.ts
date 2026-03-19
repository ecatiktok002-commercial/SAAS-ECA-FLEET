import { supabase } from './supabase';
import { format, addDays, parseISO, isValid, differenceInDays } from 'date-fns';
import { apiService } from './apiService';

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
  
  // Create a 'Normalizer' Utility
  const normalizeMatchKey = (subId: string, rawDate: string | null | undefined, rawTime: string | null | undefined, rawDuration: number | string | null | undefined) => {
    try {
      if (!rawDate) return null;
      
      // Normalize Date to YYYY-MM-DD
      let normalizedDate = '';
      const d = new Date(rawDate);
      if (isValid(d)) {
        normalizedDate = format(d, 'yyyy-MM-dd');
      } else {
        // Try to parse DD/MM/YYYY or other formats if Date() fails
        const parts = rawDate.split(/[-/]/);
        if (parts.length === 3) {
           if (parts[0].length === 4) {
             normalizedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
           } else if (parts[2].length === 4) {
             normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
           }
        }
      }
      if (!normalizedDate) return null;

      // Normalize Time to HH:mm (24h)
      let normalizedTime = '00:00';
      if (rawTime) {
        // Handle 12h format (e.g., "10:30 PM")
        const timeMatch = rawTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = timeMatch[2].padStart(2, '0');
          const modifier = timeMatch[3]?.toUpperCase();

          if (modifier === 'PM' && hours < 12) hours += 12;
          if (modifier === 'AM' && hours === 12) hours = 0;
          
          normalizedTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
        } else {
           // Handle 24h format (e.g., "22:30:00")
           normalizedTime = rawTime.substring(0, 5);
        }
      }

      // Normalize Duration
      const duration = parseInt(String(rawDuration || 0), 10);

      return `${subId}_${normalizedDate}_${normalizedTime}_${duration}`;
    } catch (e) {
      return null;
    }
  };

  // Debugging (CRITICAL)
  const debugTable: any[] = [];
  
  const agreementKeys = orphanedAgreements.map(a => {
    const key = normalizeMatchKey(subscriberId, a.start_date, a.pickup_time, a.duration_days);
    debugTable.push({
      Type: 'Agreement',
      Customer: a.customer_name,
      'Raw Date': a.start_date,
      'Raw Time': a.pickup_time,
      'Normalized Key': key
    });
    return { id: a.id, key, original: a };
  });

  const bookingKeys = orphanedBookings.map(b => {
    const key = normalizeMatchKey(subscriberId, b.start_date || b.start, b.pickup_time || (b.start ? format(new Date(b.start), 'HH:mm') : null), b.duration);
    debugTable.push({
      Type: 'Booking',
      Customer: 'N/A',
      'Raw Date': b.start_date || b.start,
      'Raw Time': b.pickup_time || (b.start ? format(new Date(b.start), 'HH:mm') : null),
      'Normalized Key': key
    });
    return { id: b.id, key, original: b };
  });

  console.table(debugTable);

  for (let i = agreementKeys.length - 1; i >= 0; i--) {
    const agreementInfo = agreementKeys[i];
    if (!agreementInfo.key) continue;
    
    // Find a matching booking
    const matchIndex = bookingKeys.findIndex(b => b.key === agreementInfo.key);

    if (matchIndex !== -1) {
      const matchedBookingInfo = bookingKeys[matchIndex];
      const agreement = agreementInfo.original;
      
      // Permanent Tagging (Database Update) - Auto Approve!
      try {
        await apiService.updateAgreement(agreement.id, subscriberId, {
          booking_id: matchedBookingInfo.id,
          payout_status: 'approved',
          total_price: agreement.total_price
        });
        console.log(`Auto-matched agreement ${agreement.id} to booking ${matchedBookingInfo.id}`);
        // Remove from orphan queues
        orphanedAgreements = orphanedAgreements.filter(a => a.id !== agreement.id);
        orphanedBookings = orphanedBookings.filter(b => b.id !== matchedBookingInfo.id);
        bookingKeys.splice(matchIndex, 1); // Remove from keys array so it's not matched again
      } catch (updateError) {
        console.error(`Failed to auto-match agreement ${agreement.id}:`, updateError);
      }
    }
  }

  // 7. Auto-Approve previously matched agreements
  // If an agreement has a booking_id, it means it's matched. It should be approved for payout automatically.
  await supabase
    .from('agreements')
    .update({ payout_status: 'approved' })
    .eq('subscriber_id', subscriberId)
    .not('booking_id', 'is', null)
    .eq('payout_status', 'pending');

  return {
    orphanedAgreements,
    orphanedBookings
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
  const { error: agreementError } = await supabase
    .from('agreements')
    .update(agreementUpdates)
    .eq('id', agreementId)
    .eq('subscriber_id', subscriberId);

  if (agreementError) throw agreementError;

  // 4. Sync with bookings table if necessary
  if (bookingId) {
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
            const { error: bookingError } = await supabase
              .from('bookings')
              .update({
                start: startTimestamp.toISOString(),
                end_time: endTimestamp.toISOString(),
                duration: duration,
                start_date: finalStartDate,
                end_date: finalEndDate,
                pickup_time: finalPickupTime,
                return_time: finalReturnTime
              })
              .eq('id', bookingId);
              
            if (bookingError) {
              console.error('Booking sync failed:', bookingError);
              throw new Error(`Agreement updated but booking sync failed: ${bookingError.message}`);
            }
          }
        } catch (err) {
          console.error('Error calculating booking sync:', err);
        }
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
