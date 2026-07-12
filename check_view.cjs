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
    
    // Check columns of subscriber_audit_view
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'subscriber_audit_view';
    `);
    
    console.log("Columns in subscriber_audit_view:");
    res.rows.forEach(r => console.log(r.column_name));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
