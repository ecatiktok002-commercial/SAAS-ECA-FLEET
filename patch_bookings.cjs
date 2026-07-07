const fs = require('fs');
let content = fs.readFileSync('services/apiService.ts', 'utf8');

const oldStr = `      const { data, error } = await query;
      
      if (error) {`;
const newStr = `      const { data, error } = await query.order('pickup_datetime', { ascending: false }).limit(500);
      
      if (error) {`;

content = content.replace(oldStr, newStr);
fs.writeFileSync('services/apiService.ts', content);
