import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://czurhanyrjgeicnbrnev.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dXJoYW55cmpnZWljbmJybmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTExMDEsImV4cCI6MjA4NzQyNzEwMX0.LV4hsQEazpbv8AcLDrEASg8s3uGKmvMJ0FrvMOX6AWQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const ref = '290726-WNYMCP';
  console.log(`Checking agreement with reference: ${ref}`);
  
  const { data: agreement, error: err1 } = await supabase
    .from('agreements')
    .select('*')
    .eq('reference_number', ref)
    .single();
    
  if (err1) {
    console.error('Error fetching agreement:', err1.message);
    return;
  }
  
  console.log('Agreement Status:', agreement.status);
  console.log('Agreement Receipt:', agreement.payment_receipt);
  console.log('Booking ID:', agreement.booking_id);
  
  const { data: booking, error: err2 } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', agreement.booking_id)
    .single();
    
  if (err2) {
    console.error('Error fetching booking:', err2.message);
    return;
  }
  
  console.log('Booking Status:', booking.status);
  
  // Retroactively fix it if needed
  if (booking.status === 'completed' && (!agreement.payment_receipt || agreement.payment_receipt === '[]' || agreement.payment_receipt === 'null')) {
      console.log('Attempting to fix booking status to active...');
      const {error: err3} = await supabase.from('bookings').update({status: 'active'}).eq('id', booking.id);
      console.log('Booking fix result:', err3 ? err3.message : 'success');
  }
}
run();
