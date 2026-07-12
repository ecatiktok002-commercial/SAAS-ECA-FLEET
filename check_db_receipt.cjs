const { Client } = require('pg');

async function run() {
  let rawPassword = process.env.POSTGRES_PASSWORD || '2xW9DI2FkTvru6nh';
  if (rawPassword.startsWith('"') && rawPassword.endsWith('"')) {
    rawPassword = rawPassword.slice(1, -1);
  }

  const client = new Client({
    host: 'db.czurhanyrjgeicnbrnev.supabase.co',
    port: 5432,
    user: 'postgres',
    password: rawPassword,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    const res = await client.query(`
      SELECT form_id, customer_name, payment_receipt, ic_license_photos, has_pending_changes, pending_changes 
      FROM subscriber_audit_view 
      WHERE customer_name = 'ZAIRUL AZWAN BIN MOHAMED';
    `);
    
    console.log("Record from view:");
    console.log(JSON.stringify(res.rows, null, 2));

    const res2 = await client.query(`
      SELECT id, payment_receipt, ic_license_photos, has_pending_changes, pending_changes 
      FROM agreements 
      WHERE customer_name = 'ZAIRUL AZWAN BIN MOHAMED';
    `);
    
    console.log("Record from agreements:");
    console.log(JSON.stringify(res2.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
