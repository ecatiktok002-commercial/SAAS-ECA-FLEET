const fs = require('fs');

let content = fs.readFileSync('pages/AgentDashboard.tsx', 'utf8');

// 1. Insert bounds calculation
const boundsCalc = `
    // Calculate Month-To-Date (MTD) and Week-To-Date (WTD) bounds
    let prevMonthYearForMtd = currentMytYear;
    let prevMonthMonthForMtd = currentMytMonth - 1;
    if (prevMonthMonthForMtd <= 0) {
      prevMonthMonthForMtd = 12;
      prevMonthYearForMtd -= 1;
    }
    const prevMonthDays2 = new Date(prevMonthYearForMtd, prevMonthMonthForMtd, 0).getDate();
    const cappedDayMonth = Math.min(currentDayOfMonth, prevMonthDays2);
    const startOfLastMonthMtdStr = \`\${prevMonthYearForMtd}-\${prevMonthMonthForMtd.toString().padStart(2, '0')}-01\`;
    const endOfLastMonthMtdStr = \`\${prevMonthYearForMtd}-\${prevMonthMonthForMtd.toString().padStart(2, '0')}-\${cappedDayMonth.toString().padStart(2, '0')}\`;

    const dayOfCycle = currentDayOfMonth - startDayThisWeek + 1;
    const startDayLastWeek = parseInt(startOfLastWeekStr.substring(8), 10);
    const endDayLastWeekLimit = parseInt(endOfLastWeekStr.substring(8), 10);
    const endDayLastWeekToDate = Math.min(startDayLastWeek + dayOfCycle - 1, endDayLastWeekLimit);
    const endOfLastWeekToDateStr = startOfLastWeekStr.substring(0, 8) + endDayLastWeekToDate.toString().padStart(2, '0');
`;

const insertBoundsRegex = /(const startOfWeekStr = `\$\{currentMytYear\}-\$\{currentMonthStr\}-\$\{startDayThisWeek.toString\(\).padStart\(2, '0'\)\}`;[\s\S]*?const endOfWeekStr = `\$\{currentMytYear\}-\$\{currentMonthStr\}-\$\{endDayThisWeek.toString\(\).padStart\(2, '0'\)\}`;)/;
content = content.replace(insertBoundsRegex, '$1\n' + boundsCalc);

// 2. Add accumulator variables
const accumVarsOld = `    let salesToday = 0;
    let salesThisWeek = 0;
    let salesLastWeek = 0;
    let salesThisMonth = 0;`;

const accumVarsNew = `    let salesToday = 0;
    let salesThisWeek = 0;
    let salesLastWeek = 0;
    let salesLastWeekToDate = 0;
    let salesThisMonth = 0;
    let salesLastMonthToDate = 0;`;

content = content.replace(accumVarsOld, accumVarsNew);

// 3. Update the loop
const loopOld = `      if (matchDateStr >= startOfLastWeekStr && matchDateStr <= endOfLastWeekStr) salesLastWeek += price;
      if (matchDateStr >= startOfMonthStr && matchDateStr <= endOfMonthStr) salesThisMonth += price;`;

const loopNew = `      if (matchDateStr >= startOfLastWeekStr && matchDateStr <= endOfLastWeekStr) salesLastWeek += price;
      if (matchDateStr >= startOfLastWeekStr && matchDateStr <= endOfLastWeekToDateStr) salesLastWeekToDate += price;
      if (matchDateStr >= startOfMonthStr && matchDateStr <= endOfMonthStr) salesThisMonth += price;
      if (matchDateStr >= startOfLastMonthMtdStr && matchDateStr <= endOfLastMonthMtdStr) salesLastMonthToDate += price;`;

content = content.replace(loopOld, loopNew);

// 4. Update the returned stats object
const statsOld = `        salesThisMonth,
        salesLastMonth,`;

const statsNew = `        salesThisMonth,
        salesLastMonth,
        salesLastMonthToDate,
        salesLastWeekToDate,`;

content = content.replace(statsOld, statsNew);

// 5. Update the UI text and logic (Week)
const weekUIOldRegex = /stats\.salesLastWeek/g;
// We need to be careful. The exact block for week:
let weekBlockMatch = content.match(/<p className="text-emerald-200\/90 text-xs font-bold uppercase tracking-widest mb-1\.5">THIS WEEK SALES<\/p>[\s\S]*?<\/div>\s*\)\s*:\s*\(\s*<p className="text-\[11px\] text-emerald-200\/70 mt-1 font-medium">No sales recorded yet this week<\/p>/);

if (weekBlockMatch) {
  let newWeekBlock = weekBlockMatch[0].replace(/stats\.salesLastWeek/g, 'stats.salesLastWeekToDate');
  newWeekBlock = newWeekBlock.replace(/vs last week/g, 'vs last week (WTD)');
  content = content.replace(weekBlockMatch[0], newWeekBlock);
}

// 6. Update the UI text and logic (Month)
let monthBlockMatch = content.match(/<p className="text-emerald-200\/90 text-xs font-bold uppercase tracking-widest mb-1\.5">THIS MONTH SALES<\/p>[\s\S]*?<\/div>\s*\)\s*:\s*\(\s*<p className="text-\[11px\] text-emerald-200\/70 mt-1 font-medium">No sales recorded yet this month<\/p>/);

if (monthBlockMatch) {
  let newMonthBlock = monthBlockMatch[0].replace(/stats\.salesLastMonth/g, 'stats.salesLastMonthToDate');
  newMonthBlock = newMonthBlock.replace(/vs last month/g, 'vs last month (MTD)');
  content = content.replace(monthBlockMatch[0], newMonthBlock);
}


fs.writeFileSync('pages/AgentDashboard.tsx', content);
