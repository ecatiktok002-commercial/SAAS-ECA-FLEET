const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://czurhanyrjgeicnbrnev.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dXJoYW55cmpnZWljbmJybmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTExMDEsImV4cCI6MjA4NzQyNzEwMX0.LV4hsQEazpbv8AcLDrEASg8s3uGKmvMJ0FrvMOX6AWQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: ags, error } = await supabase
    .from('agreements')
    .select('id, reference_number, customer_name, agent_name, status, payout_status, booking_id, start_date')
    .eq('reference_number', '110726-37FX8J');
    
  console.log("Agreements with ref 110726-37FX8J:", ags);

  if (ags && ags.length > 0) {
     for (const ag of ags) {
       if (ag.booking_id) {
         const { data: b } = await supabase.from('bookings').select('id, status').eq('id', ag.booking_id).single();
         console.log(`Booking for agreement ${ag.id}:`, b);
       }
     }
  }
}
run();
