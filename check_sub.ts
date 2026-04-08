import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

async function run() {
  const { data, error } = await supabase.from('subscribers').select('id, name').limit(5);
  console.log("Subscribers:", data);
  
  const { data: users, error: uError } = await supabase.auth.admin.listUsers();
  console.log("Users:", users?.users.map(u => ({ id: u.id, email: u.email })).slice(0, 5));
}
run();
