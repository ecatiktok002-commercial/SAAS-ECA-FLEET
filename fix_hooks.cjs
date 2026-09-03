const fs = require('fs');

let content = fs.readFileSync('pages/AgentDashboard.tsx', 'utf8');

const actionQueueRegex = /  const actionQueueTasks = useMemo\(\(\) => \{[\s\S]*?  \}, \[dashboardData, navigate, currencyFormatter\]\);\n/;
const match = content.match(actionQueueRegex);

if (match) {
  content = content.replace(actionQueueRegex, ''); // remove it from its current position
  
  // place it before the `if (loading) {` block
  const loadingRegex = /  if \(loading\) \{/;
  content = content.replace(loadingRegex, match[0] + '\n' + '  if (loading) {');
  
  fs.writeFileSync('pages/AgentDashboard.tsx', content);
  console.log('Fixed hooks order');
} else {
  console.log('Could not find actionQueueTasks');
}
