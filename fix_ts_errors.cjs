const fs = require('fs');
let content = fs.readFileSync('pages/AuditPayoutManagement.tsx', 'utf8');

// The problematic lines:
// 1. if (!fullAgreement || !fullAgreement.ic_license_photos || fullAgreement.ic_license_photos === '[]' || fullAgreement.ic_license_photos === 'null')
// Fix to: if (!fullAgreement || !fullAgreement.ic_license_photos || (fullAgreement.ic_license_photos as any) === '[]' || (fullAgreement.ic_license_photos as any) === 'null')

content = content.replace(/fullAgreement\.ic_license_photos === '\[\]'/g, "(fullAgreement.ic_license_photos as any) === '[]'");
content = content.replace(/fullAgreement\.ic_license_photos === 'null'/g, "(fullAgreement.ic_license_photos as any) === 'null'");

// 2. typeof fullAgreement.ic_license_photos === 'string'
// This one is already checking if it's a string, but TS complains about JSON.parse.
// Wait, the error is:
// pages/AuditPayoutManagement.tsx(675,52): error TS2352: Conversion of type 'string[]' to type 'string' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
content = content.replace(/allUrls = \[fullAgreement\.ic_license_photos as string\];/g, "allUrls = [fullAgreement.ic_license_photos as unknown as string];");

fs.writeFileSync('pages/AuditPayoutManagement.tsx', content);
console.log("Fixed TS errors");
