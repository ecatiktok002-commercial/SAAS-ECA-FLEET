const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://czurhanyrjgeicnbrnev.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dXJoYW55cmpnZWljbmJybmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTExMDEsImV4cCI6MjA4NzQyNzEwMX0.LV4hsQEazpbv8AcLDrEASg8s3uGKmvMJ0FrvMOX6AWQ');

async function run() {
  const { data, error } = await supabase
    .from('agreements')
    .select('id, start_date, end_date, duration_days, total_price, status, payout_status')
    .eq('car_plate_number', 'VPJ6727');
  
  if (error) { console.error(error); return; }

  const juneBookings = data.filter(b => {
    return b.start_date.startsWith('2026-06') || (b.end_date && b.end_date.startsWith('2026-06')) || (b.start_date.startsWith('2026-05') && b.end_date && b.end_date.startsWith('2026-06'));
  });

  console.log(juneBookings);
}
run();
