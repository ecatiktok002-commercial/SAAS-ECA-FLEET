const fs = require('fs');
let content = fs.readFileSync('pages/AdminDashboard.tsx', 'utf8');

content = content.replace(
  /<div className={`flex items-center text-xs font-medium mt-2 \${stats.salesThisWeek >= stats.salesLastWeekApples \? 'text-emerald-600' : 'text-rose-600'}`}>\s*\{stats\.salesThisWeek/g,
  '<div title="Apples-to-apples comparison (Same period last week)" className={`flex items-center text-xs font-medium mt-2 cursor-help ${stats.salesThisWeek >= stats.salesLastWeekApples ? \'text-emerald-600\' : \'text-rose-600\'}`}>\n                  {stats.salesThisWeek'
);

content = content.replace(
  /<div className={`flex items-center text-xs font-medium mt-2 \${stats.salesThisMonth >= stats.salesLastMonthApples \? 'text-emerald-600' : 'text-rose-600'}`}>\s*\{stats\.salesThisMonth/g,
  '<div title="Apples-to-apples comparison (Same period last month)" className={`flex items-center text-xs font-medium mt-2 cursor-help ${stats.salesThisMonth >= stats.salesLastMonthApples ? \'text-emerald-600\' : \'text-rose-600\'}`}>\n                  {stats.salesThisMonth'
);

fs.writeFileSync('pages/AdminDashboard.tsx', content);
