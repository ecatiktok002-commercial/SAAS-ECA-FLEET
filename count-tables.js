import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL.replace(/^["']|["']$/g, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY).replace(/^["']|["']$/g, '');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  const t = ['cars', 'agreements', 'customers', 'profiles', 'bookings', 'staff', 'subscribers', 'staff_members', 'payout_history', 'agreements_light', 'staff_stats', 'car_utilization_stats', 'handover_records', 'saas_revenue_stats', 'marketing_events', 'logs', 'expenses', 'car_monthly_usage', 'members'];
  for (const table of t) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) console.log(`Error on ${table}: ${error.message}`);
    else console.log(`${table}: ${count} rows`);
  }
}
check();
