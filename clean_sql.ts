import * as fs from 'fs';
const schema = fs.readFileSync('supabase_schema.sql', 'utf8');

// Filter out lines containing digital_forms
const newSchema = schema.split('\n').filter(line => !line.includes('digital_forms')).join('\n');
fs.writeFileSync('supabase_schema.sql', newSchema);
console.log('done filtering digital_forms lines from supabase schema');
