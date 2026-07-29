const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (!pkg.dependencies['@google/genai']) {
  pkg.dependencies['@google/genai'] = '^0.1.2';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
}
