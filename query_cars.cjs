const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://czurhanyrjgeicnbrnev.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dXJoYW55cmpnZWljbmJybmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTExMDEsImV4cCI6MjA4NzQyNzEwMX0.LV4hsQEazpbv8AcLDrEASg8s3uGKmvMJ0FrvMOX6AWQ');

async function run() {
  const { data: cars } = await supabase.from('cars').select('*').eq('subscriber_id', 'be5c97d4-4a83-49dd-8f5d-5616c54c72fd');
  console.log(cars);
}
run();
