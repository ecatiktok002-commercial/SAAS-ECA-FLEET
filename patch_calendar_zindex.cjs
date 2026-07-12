const fs = require('fs');
let content = fs.readFileSync('components/CalendarView.tsx', 'utf8');

const search = `sticky top-0 z-40`;
const replace = `sticky top-0 z-30`;

if (content.indexOf(search) !== -1) {
    content = content.replace(search, replace);
    fs.writeFileSync('components/CalendarView.tsx', content);
    console.log("Patched CalendarView.tsx successfully");
} else {
    console.log("Could not find the target z-40 string");
}
