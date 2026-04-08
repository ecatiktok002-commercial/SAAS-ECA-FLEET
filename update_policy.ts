import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const sql = `
    DROP POLICY IF EXISTS "Payout history access" ON payout_history;
    CREATE POLICY "Payout history access" ON payout_history 
      FOR ALL USING (
        auth.uid() = subscriber_id -- Subscriber
        OR 
        subscriber_id = current_subscriber_id() -- Agent/Staff
        OR
        (auth.jwt() ->> 'email' = 'superadmin@ecafleet.com') -- Superadmin
      )
      WITH CHECK (
        auth.uid() = subscriber_id -- Subscriber
        OR 
        subscriber_id = current_subscriber_id() -- Agent/Staff
        OR
        (auth.jwt() ->> 'email' = 'superadmin@ecafleet.com') -- Superadmin
      );
  `;

  const { error } = await supabase.rpc('exec_sql', { sql_string: sql });
  if (error) {
    console.error("Error executing SQL via RPC:", error);
    console.log("Please run the SQL manually in Supabase SQL Editor if RPC fails.");
  } else {
    console.log("Policy updated successfully!");
  }
}

run();
