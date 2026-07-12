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
    
    // Find the end of the SELECT list
    const fromIndex = viewDef.indexOf('FROM agreements');
    const selectPart = viewDef.substring(0, fromIndex);
    const fromPart = viewDef.substring(fromIndex);
    
    // Append ic_license_photos
    const newSelectPart = selectPart.trim().replace(/,\s*$/, '') + ',\n    a.ic_license_photos\n   ';
    
    const newViewDef = `CREATE OR REPLACE VIEW subscriber_audit_view AS ${newSelectPart}${fromPart}`;
    
    console.log("New view def:");
    console.log(newViewDef);
    
    await client.query(newViewDef);
    
    console.log("View updated successfully");

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
