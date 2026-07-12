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
      SELECT pg_get_viewdef('subscriber_audit_view', true) AS view_def;
    `);
    
    console.log(res.rows[0].view_def);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
