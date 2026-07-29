import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL.replace(/^["']|["']$/g, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY).replace(/^["']|["']$/g, '');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data: d1 } = await supabase.from('staff').select('id');
  const { data: d2 } = await supabase.from('staff_members').select('id');
  const { data: d3 } = await supabase.from('members').select('id');
  console.log("Staff count:", d1?.length);
  console.log("Staff_members count:", d2?.length);
  console.log("Members count:", d3?.length);
}
run();
