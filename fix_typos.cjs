const fs = require('fs');
let content = fs.readFileSync('pages/AdminDashboard.tsx', 'utf8');

content = content.replace(/stats\.salesLastWeekApplesApples/g, 'stats.salesLastWeekApples');
content = content.replace(/stats\.salesLastMonthApplesApples/g, 'stats.salesLastMonthApples');

fs.writeFileSync('pages/AdminDashboard.tsx', content);
