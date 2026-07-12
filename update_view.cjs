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
    
    // Get current view def
    const res = await client.query(`
      SELECT pg_get_viewdef('subscriber_audit_view', true) AS view_def;
    `);
    
    let viewDef = res.rows[0].view_def;
    // modify it to include ic_license_photos
    viewDef = viewDef.replace('a.payment_receipt,', 'a.payment_receipt, a.ic_license_photos,');
    
    console.log("New view def:");
    console.log(viewDef);
    
    await client.query(`
      CREATE OR REPLACE VIEW subscriber_audit_view AS 
      ${viewDef}
    `);
    
    console.log("View updated successfully");

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
