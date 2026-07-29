import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL.replace(/^["']|["']$/g, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY).replace(/^["']|["']$/g, '');

async function run() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_KEY}`);
  const data = await res.json();
  const defs = data.definitions;
  
  for (const table of ['staff', 'staff_members', 'members', 'agreements', 'agreements_light']) {
    console.log(`\nTable: ${table}`);
    const props = defs[table]?.properties;
    if (props) {
      for (const col of Object.keys(props)) {
        console.log(`  - ${col}: ${props[col].type} (${props[col].format || ''})`);
      }
    }
  }
}
run();
