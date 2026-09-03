const fs = require('fs');
let content = fs.readFileSync('pages/AdminDashboard.tsx', 'utf8');

// First, inject the calculations for Apples-to-Apples dates right after endOfLastWeekStr is set.
const replacementBlock1 = `
    let startOfLastWeekStr = '';
    let endOfLastWeekStr = '';
    let endOfLastWeekApplesStr = '';

    if (currentDayOfMonth >= 1 && currentDayOfMonth <= 7) {
      startDayThisWeek = 1;
      endDayThisWeek = 7;
      thisWeekCycleLabel = \`Week 1 (Day 1 - 7)\`;

      // Last week is Previous Month's Week 4 (Day 24 to End of Prev Month)
      let prevYear = currentMytYear;
      let prevMonth = currentMytMonth - 1;
      if (prevMonth <= 0) {
        prevMonth = 12;
        prevYear -= 1;
      }
      const prevMonthDays = new Date(prevYear, prevMonth, 0).getDate();
      const prevMonthStr = prevMonth.toString().padStart(2, '0');
      startOfLastWeekStr = \`\${prevYear}-\${prevMonthStr}-24\`;
      endOfLastWeekStr = \`\${prevYear}-\${prevMonthStr}-\${prevMonthDays.toString().padStart(2, '0')}\`;
      
      const dayOffset = currentDayOfMonth - startDayThisWeek;
      const applesEndDay = 24 + dayOffset;
      endOfLastWeekApplesStr = \`\${prevYear}-\${prevMonthStr}-\${applesEndDay.toString().padStart(2, '0')}\`;
    } else if (currentDayOfMonth >= 8 && currentDayOfMonth <= 15) {
      startDayThisWeek = 8;
      endDayThisWeek = 15;
      thisWeekCycleLabel = \`Week 2 (Day 8 - 15)\`;

      startOfLastWeekStr = \`\${currentMytYear}-\${currentMonthStr}-01\`;
      endOfLastWeekStr = \`\${currentMytYear}-\${currentMonthStr}-07\`;
      
      const dayOffset = currentDayOfMonth - startDayThisWeek;
      const applesEndDay = 1 + dayOffset;
      endOfLastWeekApplesStr = \`\${currentMytYear}-\${currentMonthStr}-\${applesEndDay.toString().padStart(2, '0')}\`;
    } else if (currentDayOfMonth >= 16 && currentDayOfMonth <= 23) {
      startDayThisWeek = 16;
      endDayThisWeek = 23;
      thisWeekCycleLabel = \`Week 3 (Day 16 - 23)\`;

      startOfLastWeekStr = \`\${currentMytYear}-\${currentMonthStr}-08\`;
      endOfLastWeekStr = \`\${currentMytYear}-\${currentMonthStr}-15\`;
      
      const dayOffset = currentDayOfMonth - startDayThisWeek;
      const applesEndDay = 8 + dayOffset;
      endOfLastWeekApplesStr = \`\${currentMytYear}-\${currentMonthStr}-\${applesEndDay.toString().padStart(2, '0')}\`;
    } else {
      startDayThisWeek = 24;
      endDayThisWeek = monthDays;
      thisWeekCycleLabel = \`Week 4 (Day 24 - \${monthDays})\`;

      startOfLastWeekStr = \`\${currentMytYear}-\${currentMonthStr}-16\`;
      endOfLastWeekStr = \`\${currentMytYear}-\${currentMonthStr}-23\`;
      
      const dayOffset = currentDayOfMonth - startDayThisWeek;
      const applesEndDay = 16 + dayOffset;
      endOfLastWeekApplesStr = \`\${currentMytYear}-\${currentMonthStr}-\${applesEndDay.toString().padStart(2, '0')}\`;
    }

    const startOfWeekStr = \`\${currentMytYear}-\${currentMonthStr}-\${startDayThisWeek.toString().padStart(2, '0')}\`;
    const endOfWeekStr = \`\${currentMytYear}-\${currentMonthStr}-\${endDayThisWeek.toString().padStart(2, '0')}\`;

    // Last Month Apples-to-Apples Dates
    let prevYearLastMonth = currentMytYear;
    let prevMonthLastMonth = currentMytMonth - 1;
    if (prevMonthLastMonth <= 0) {
        prevMonthLastMonth = 12;
        prevYearLastMonth -= 1;
    }
    const prevMonthLastMonthStr = prevMonthLastMonth.toString().padStart(2, '0');
    const startOfLastMonthStr = \`\${prevYearLastMonth}-\${prevMonthLastMonthStr}-01\`;
    const prevMonthDaysApples = new Date(prevYearLastMonth, prevMonthLastMonth, 0).getDate();
    const applesToApplesLastMonthDay = Math.min(currentDayOfMonth, prevMonthDaysApples);
    const endOfLastMonthApplesStr = \`\${prevYearLastMonth}-\${prevMonthLastMonthStr}-\${applesToApplesLastMonthDay.toString().padStart(2, '0')}\`;
`;

// regex to replace the block
const regexBlock1 = /let startOfLastWeekStr = '';[\s\S]*?const endOfWeekStr = `\${currentMytYear}-\${currentMonthStr}-\${endDayThisWeek\.toString\(\)\.padStart\(2, '0'\)}`;/;
content = content.replace(regexBlock1, replacementBlock1);

// Add the variables
content = content.replace(
  'let salesThisWeek = 0;\n    let salesLastWeek = 0;\n    let salesThisMonth = 0;',
  'let salesThisWeek = 0;\n    let salesLastWeek = 0;\n    let salesLastWeekApples = 0;\n    let salesThisMonth = 0;\n    let salesLastMonthApples = 0;'
);

// Add to the forEach loop
const loopReplace = `if (matchDateStr >= startOfLastWeekStr && matchDateStr <= endOfLastWeekStr) salesLastWeek += price;
      if (matchDateStr >= startOfLastWeekStr && matchDateStr <= endOfLastWeekApplesStr) salesLastWeekApples += price;
      if (matchDateStr >= startOfMonthStr && matchDateStr <= endOfMonthStr) salesThisMonth += price;
      if (matchDateStr >= startOfLastMonthStr && matchDateStr <= endOfLastMonthApplesStr) salesLastMonthApples += price;`;
      
content = content.replace(/if \(matchDateStr >= startOfLastWeekStr && matchDateStr <= endOfLastWeekStr\) salesLastWeek \+= price;\s*if \(matchDateStr >= startOfMonthStr && matchDateStr <= endOfMonthStr\) salesThisMonth \+= price;/, loopReplace);

// Update stats return
content = content.replace(
  'salesLastWeek,\n        salesThisMonth,\n        salesLastMonth,',
  'salesLastWeek,\n        salesLastWeekApples,\n        salesThisMonth,\n        salesLastMonth,\n        salesLastMonthApples,'
);

// Update UI for Sales This Week
content = content.replace(
  /\{stats\.salesThisWeek >= stats\.salesLastWeek \? '↑ \+' : '↓ '\}\{Math\.abs\(Number\(\(\(\(stats\.salesThisWeek - stats\.salesLastWeek\) \/ stats\.salesLastWeek\) \* 100\)\.toFixed\(1\)\)\)\}% vs last week/g,
  '{stats.salesThisWeek >= stats.salesLastWeekApples ? \'↑ +\' : \'↓ \'}{Math.abs(Number((((stats.salesThisWeek - stats.salesLastWeekApples) / stats.salesLastWeekApples) * 100).toFixed(1)))}% vs last week'
);
content = content.replace(
  /stats\.salesThisWeek >= stats\.salesLastWeek/g,
  'stats.salesThisWeek >= stats.salesLastWeekApples'
);
content = content.replace(
  /stats\.salesLastWeek > 0 \?/g,
  'stats.salesLastWeekApples > 0 ?'
);

// Update UI for Sales This Month
content = content.replace(
  /\{stats\.salesThisMonth >= stats\.salesLastMonth \? '↑ \+' : '↓ '\}\{Math\.abs\(Number\(\(\(\(stats\.salesThisMonth - stats\.salesLastMonth\) \/ stats\.salesLastMonth\) \* 100\)\.toFixed\(1\)\)\)\}% vs last month/g,
  '{stats.salesThisMonth >= stats.salesLastMonthApples ? \'↑ +\' : \'↓ \'}{Math.abs(Number((((stats.salesThisMonth - stats.salesLastMonthApples) / stats.salesLastMonthApples) * 100).toFixed(1)))}% vs last month'
);
content = content.replace(
  /stats\.salesThisMonth >= stats\.salesLastMonth/g,
  'stats.salesThisMonth >= stats.salesLastMonthApples'
);
content = content.replace(
  /stats\.salesLastMonth > 0 \?/g,
  'stats.salesLastMonthApples > 0 ?'
);

fs.writeFileSync('pages/AdminDashboard.tsx', content);
