import fs from 'fs';
import path from 'path';

const logsDir = 'logs';
const files = fs.readdirSync(logsDir);
for (const file of files) {
  if (file.includes('184')) {
    console.log(fs.readFileSync(path.join(logsDir, file), 'utf8'));
  }
}
