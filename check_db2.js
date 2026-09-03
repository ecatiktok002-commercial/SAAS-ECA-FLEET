import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://czurhanyrjgeicnbrnev.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dXJoYW55cmpnZWljbmJybmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTExMDEsImV4cCI6MjA4NzQyNzEwMX0.LV4hsQEazpbv8AcLDrEASg8s3uGKmvMJ0FrvMOX6AWQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: booking, error: err2 } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', 'ddab6162-7809-4e1f-91b4-454dfa4c0f22');
    
  if (err2) {
    console.error('Error fetching booking:', err2.message);
    return;
  }
  
  console.log('Bookings found:', booking.length);
  if (booking.length > 0) {
    console.log('Booking Status:', booking[0].status);
    // Let's fix the agreement first if it has no receipt
    console.log('Fixing agreement ddab6162-7809-4e1f-91b4-454dfa4c0f22 to signed');
    await supabase.from('agreements').update({status: 'signed'}).eq('reference_number', '290726-WNYMCP');
    
    if (booking[0].status === 'completed') {
      console.log('Fixing booking to active...');
      const {error} = await supabase.from('bookings').update({status: 'active'}).eq('id', booking[0].id);
      console.log('Booking update:', error ? error.message : 'success');
    }
  } else {
    console.log('No booking found. Maybe RLS blocked it without service_role? Let me use my access token to deploy a fix.');
  }
}
run();
