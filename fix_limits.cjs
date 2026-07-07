const fs = require('fs');
let content = fs.readFileSync('services/apiService.ts', 'utf8');

// Revert the bad getCars patch
content = content.replace(
  "const { data, error } = await query.order('pickup_datetime', { ascending: false }).limit(500);",
  "const { data, error } = await query.order('created_at', { ascending: false }).limit(500);" // wait, cars don't have pickup_datetime, but they have created_at
);

// Apply getBookings patch
content = content.replace(
  "const { data, error } = await query;\n      \n      if (error) {\n        logSupabaseError('getBookings', error);",
  "const { data, error } = await query.order('pickup_datetime', { ascending: false }).limit(500);\n      \n      if (error) {\n        logSupabaseError('getBookings', error);"
);

// getStaffMembers - wait, it returns all staff members
// Let's replace any remaining `const { data, error } = await query;` with limits if needed, or leave them.

fs.writeFileSync('services/apiService.ts', content);
