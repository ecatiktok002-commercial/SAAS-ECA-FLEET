const fs = require('fs');
let content = fs.readFileSync('pages/CalendarPage.tsx', 'utf8');

const search = `shrink-0 z-50 border-b`;
const replace = `shrink-0 z-30 border-b`;

if (content.indexOf(search) !== -1) {
    content = content.replace(search, replace);
    fs.writeFileSync('pages/CalendarPage.tsx', content);
    console.log("Patched CalendarPage.tsx successfully");
} else {
    console.log("Could not find the target z-50 string");
}
