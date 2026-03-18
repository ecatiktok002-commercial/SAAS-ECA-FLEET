import { supabase } from './supabase';

/**
 * Executes the Phase 1 Matchy Scan for a specific month and subscriber.
 * Strictly enforces Multi-Tenant Data Isolation.
 */
export const runMatchyScan = async (subscriberId: string, monthStartDate: string, monthEndDate: string) => {
  
  const { data, error } = await supabase.rpc('get_matchy_orphans', {
    p_subscriber_id: subscriberId,
    p_start_date: monthStartDate,
    p_end_date: monthEndDate
  });

  if (error) {
    throw new Error(`Error running Matchy Scan: ${error.message}`);
  }

  // The RPC returns a JSON object with two arrays
  return {
    orphanedAgreements: data?.orphanedAgreements || [],
    orphanedBookings: data?.orphanedBookings || []
  };
};
