const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://czurhanyrjgeicnbrnev.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dXJoYW55cmpnZWljbmJybmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTExMDEsImV4cCI6MjA4NzQyNzEwMX0.LV4hsQEazpbv8AcLDrEASg8s3uGKmvMJ0FrvMOX6AWQ');

async function run() {
  const { data: cars } = await supabase.from('cars').select('id').eq('subscriber_id', 'be5c97d4-4a83-49dd-8f5d-5616c54c72fd').eq('plate', 'VPJ6727');
  if (!cars || cars.length === 0) return console.log("Car not found in cars");
  
  const { data: bookings } = await supabase.from('bookings').select('id, start_date, duration_days, pickup_time, return_time, status').eq('car_id', cars[0].id).neq('status', 'cancelled');
  
  const juneBookings = bookings.filter(b => b.start_date.includes('-06-') || b.start_date.includes('-05-'));
  console.log(juneBookings);
}
run();
