const fs = require('fs');
let content = fs.readFileSync('pages/AgentDashboard.tsx', 'utf8');

const search = `<div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-3 gap-4 items-start">`;
const replace = `<div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-4 items-start">`;

const search2 = `<div className="text-right">
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">LIFETIME EARNINGS 🏆</p>
                  <p className="text-2xl font-bold">{currencyFormatter.format(lifetimeEarnings)}</p>
                </div>`;
const replace2 = `<div className="text-left sm:text-right">
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">LIFETIME EARNINGS 🏆</p>
                  <p className="text-2xl font-bold">{currencyFormatter.format(lifetimeEarnings)}</p>
                </div>`;

if (content.indexOf(search) !== -1) {
    content = content.replace(search, replace);
    if (content.indexOf(search2) !== -1) {
        content = content.replace(search2, replace2);
    }
    fs.writeFileSync('pages/AgentDashboard.tsx', content);
    console.log("Patched AgentDashboard.tsx successfully");
} else {
    console.log("Could not find the target grid string");
}
