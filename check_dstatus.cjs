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
      SELECT status, payout_status 
      FROM subscriber_audit_view 
      WHERE customer_name = 'ZAIRUL AZWAN BIN MOHAMED';
    `);
    
    console.log("Record from view:");
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
