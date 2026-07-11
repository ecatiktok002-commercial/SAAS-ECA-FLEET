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
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log("Connected to PostgreSQL database!");

    // Update agreements that are 'completed' but have no payment receipt.
    // If they have signature_data, set to 'signed', else 'pending'.
    const updateQuery = `
      UPDATE agreements
      SET status = CASE 
          WHEN signature_data IS NOT NULL AND signature_data != '' THEN 'signed'
          ELSE 'pending'
      END
      WHERE status = 'completed' 
        AND (payment_receipt IS NULL OR payment_receipt = '[]' OR payment_receipt = 'null' OR payment_receipt = '');
    `;
    
    console.log(`Running: ${updateQuery}`);
    const res = await client.query(updateQuery);
    console.log(`Updated ${res.rowCount} agreements that were incorrectly marked as completed.`);

    // Also update any 'signed' agreements that DO have a receipt to 'completed' just in case.
    const updateQuery2 = `
      UPDATE agreements
      SET status = 'completed'
      WHERE status = 'signed' 
        AND payment_receipt IS NOT NULL 
        AND payment_receipt != '[]' 
        AND payment_receipt != 'null' 
        AND payment_receipt != '';
    `;
    
    console.log(`Running: ${updateQuery2}`);
    const res2 = await client.query(updateQuery2);
    console.log(`Updated ${res2.rowCount} agreements that had receipts but were only 'signed'.`);

  } catch (err) {
    console.error("Error executing SQL directly:", err);
  } finally {
    await client.end();
  }
}

run();
