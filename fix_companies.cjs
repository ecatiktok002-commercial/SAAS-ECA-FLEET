const fs = require('fs');
let content = fs.readFileSync('services/apiService.ts', 'utf8');

content = content.replace(
  "async getCompanies(): Promise<Company[]> {\n    return withRetry(async () => {\n      const { data, error } = await supabase\n        .from('subscribers')\n        .select('*')\n        .order('name', { ascending: true });",
  "async getCompanies(): Promise<Company[]> {\n    return withRetry(async () => {\n      const { data, error } = await supabase\n        .from('subscribers')\n        .select('id, name, brand_name, tier, is_active, status, is_trial, expiry_date, created_at, address, contact')\n        .order('name', { ascending: true });"
);

fs.writeFileSync('services/apiService.ts', content);
