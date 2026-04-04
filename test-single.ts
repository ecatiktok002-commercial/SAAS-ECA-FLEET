import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function test() {
  const { data, error } = await supabase.from('cars').select('*').eq('id', '00000000-0000-0000-0000-000000000000').single();
  console.log('Data:', data);
  console.log('Error:', error);
}
test();
