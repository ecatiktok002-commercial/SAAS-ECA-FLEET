const fs = require('fs');
let content = fs.readFileSync('services/apiService.ts', 'utf8');

const fixes = [
  { line: 894, target: "query = applySubscriberFilter(query, targetSubscriberId);", repl: "query = applySubscriberFilter(query, subscriberId);" },
  { line: 1582, target: "const { data: subData } = await supabase.from('subscribers').select('name').eq('id', targetSubscriberId).single();", repl: "const { data: subData } = await supabase.from('subscribers').select('name').eq('id', subscriberId).single();" },
  { line: 1875, target: ".eq('id', targetSubscriberId)", repl: ".eq('id', subscriberId)" },
  { line: 2029, target: "query = applySubscriberFilter(query, targetSubscriberId);", repl: "query = applySubscriberFilter(query, subscriberId);" }
];

let lines = content.split('\n');

for (const fix of fixes) {
  lines[fix.line] = lines[fix.line].replace(fix.target, fix.repl);
}

fs.writeFileSync('services/apiService.ts', lines.join('\n'));
