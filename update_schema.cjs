const fs = require('fs');
const content = fs.readFileSync('supabase_schema.sql', 'utf8');
const updated = content.replace(/company_id/g, 'subscriber_id');
fs.writeFileSync('supabase_schema.sql', updated);
console.log('Updated supabase_schema.sql');
