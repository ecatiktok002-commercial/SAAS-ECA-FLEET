const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://czurhanyrjgeicnbrnev.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dXJoYW55cmpnZWljbmJybmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTExMDEsImV4cCI6MjA4NzQyNzEwMX0.LV4hsQEazpbv8AcLDrEASg8s3uGKmvMJ0FrvMOX6AWQ');

async function run() {
  const { data: ags } = await supabase.from('agreements').select('subscriber_id').eq('car_plate_number', 'VPJ6727').limit(1);
  console.log(ags);
}
run();
