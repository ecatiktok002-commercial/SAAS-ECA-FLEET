const fs = require('fs');
let content = fs.readFileSync('types.ts', 'utf8');

const search = `  payment_receipt: string | null;`;
const replace = `  payment_receipt: string | null;
  ic_license_photos?: string | null;`;

if (content.indexOf(search) !== -1) {
    content = content.replace(search, replace);
    fs.writeFileSync('types.ts', content);
    console.log("Patched types.ts");
} else {
    console.log("Could not find search string");
}
