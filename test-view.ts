import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://czurhanyrjgeicnbrnev.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dXJoYW55cmpnZWljbmJybmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTExMDEsImV4cCI6MjA4NzQyNzEwMX0.LV4hsQEazpbv8AcLDrEASg8s3uGKmvMJ0FrvMOX6AWQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkView() {
  // Let's try to fetch the view definition using a raw query if possible via RPC.
  // Actually, let's just check if there's any RPC that calculates it.
  const { data, error } = await supabase.from('car_utilization_stats').select('*').limit(1);
  console.log('Data:', data);
  console.log('Error:', error);
}

checkView();
