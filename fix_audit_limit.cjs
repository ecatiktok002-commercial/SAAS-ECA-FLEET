const fs = require('fs');
let content = fs.readFileSync('services/apiService.ts', 'utf8');

content = content.replace(
  "query = applySubscriberFilter(query, targetSubscriberId);\n\n      const { data, error } = await query;",
  "query = applySubscriberFilter(query, targetSubscriberId);\n\n      const { data, error } = await query.order('form_id', { ascending: false }).limit(200);"
);

fs.writeFileSync('services/apiService.ts', content);
