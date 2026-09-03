const fs = require('fs');

let content = fs.readFileSync('pages/AgentDashboard.tsx', 'utf8');

// The week block
const weekBlockRegex = /(<p className="text-emerald-200\/90 text-xs font-bold uppercase tracking-widest mb-1\.5">THIS WEEK SALES<\/p>[\s\S]*?<p className="text-\[11px\] text-emerald-200\/70 mt-1 font-medium">No sales recorded yet this week<\/p>\s*<\/div>\s*\)\s*})/g;

content = content.replace(weekBlockRegex, (match) => {
  return match
    .replace(/stats\.salesLastWeek/g, 'stats.salesLastWeekToDate')
    .replace(/vs last week/g, 'vs last week (WTD)');
});

// The month block
const monthBlockRegex = /(<p className="text-emerald-200\/90 text-xs font-bold uppercase tracking-widest mb-1\.5">THIS MONTH SALES<\/p>[\s\S]*?<p className="text-\[11px\] text-emerald-200\/70 mt-1 font-medium">No sales recorded yet this month<\/p>\s*<\/div>\s*\)\s*})/g;

content = content.replace(monthBlockRegex, (match) => {
  return match
    .replace(/stats\.salesLastMonth/g, 'stats.salesLastMonthToDate')
    .replace(/vs last month/g, 'vs last month (MTD)');
});

fs.writeFileSync('pages/AgentDashboard.tsx', content);
