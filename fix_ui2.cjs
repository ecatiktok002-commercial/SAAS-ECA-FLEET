const fs = require('fs');
let content = fs.readFileSync('pages/AgentDashboard.tsx', 'utf8');

// Find the whole block from "THIS WEEK SALES" to the end of the THIS MONTH SALES block
let match = content.match(/(THIS WEEK SALES[\s\S]*?No sales recorded yet this month<\/p>\s*\)\s*})/);

if (match) {
  let block = match[0];
  
  // For Week
  let weekBlock = block.match(/THIS WEEK SALES[\s\S]*?this week<\/p>\s*\)\s*}/)[0];
  let newWeekBlock = weekBlock
    .replace(/stats\.salesLastWeek/g, 'stats.salesLastWeekToDate')
    .replace(/vs last week/g, 'vs last week (WTD)');
    
  block = block.replace(weekBlock, newWeekBlock);
  
  // For Month
  let monthBlock = block.match(/THIS MONTH SALES[\s\S]*?this month<\/p>\s*\)\s*}/)[0];
  let newMonthBlock = monthBlock
    .replace(/stats\.salesLastMonth/g, 'stats.salesLastMonthToDate')
    .replace(/vs last month/g, 'vs last month (MTD)');
    
  block = block.replace(monthBlock, newMonthBlock);
  
  content = content.replace(match[0], block);
  fs.writeFileSync('pages/AgentDashboard.tsx', content);
  console.log("Success");
} else {
  console.log("Failed to match");
}
