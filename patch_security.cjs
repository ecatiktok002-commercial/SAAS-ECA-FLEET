const fs = require('fs');
let content = fs.readFileSync('services/apiService.ts', 'utf8');

// We will inject `const targetSubscriberId = await getTenantId();` right after `validateSubscriber(subscriberId);`
// and replace `applySubscriberFilter(query, subscriberId)` with `applySubscriberFilter(query, targetSubscriberId)`

content = content.replace(/validateSubscriber\(subscriberId\);\n    return withRetry\(async \(\) => {/g, 
  "validateSubscriber(subscriberId);\n    const targetSubscriberId = await getTenantId();\n    return withRetry(async () => {");

content = content.replace(/applySubscriberFilter\(query, subscriberId\)/g, "applySubscriberFilter(query, targetSubscriberId)");

fs.writeFileSync('services/apiService.ts', content);
