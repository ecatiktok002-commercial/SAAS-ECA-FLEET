const fs = require('fs');
let content = fs.readFileSync('services/apiService.ts', 'utf8');

const sizeCheckHelper = `
// Countermeasure for DB crashes: prevent HUGE base64 payloads
const validatePayloadSize = (payload: any) => {
  let totalSize = 0;
  const fields = ['payment_receipt', 'signature_data', 'photos_url', 'ic_license_photos'];
  for (const field of fields) {
    if (payload[field]) {
      const val = payload[field];
      if (typeof val === 'string') {
        totalSize += val.length;
      } else if (Array.isArray(val)) {
        totalSize += val.join('').length;
      }
    }
  }
  // If base64 payload is > 10MB (approx 10,000,000 chars), reject to prevent Supabase 522 Timeout
  if (totalSize > 10000000) {
    throw new Error('Payload size exceeded. Please compress your images before uploading. Maximum total size is 7MB.');
  }
};
`;

if (!content.includes('const validatePayloadSize')) {
    content = content.replace("import { supabase } from './supabase';", "import { supabase } from './supabase';\n" + sizeCheckHelper);
    fs.writeFileSync('services/apiService.ts', content);
    console.log("Added declaration.");
} else {
    console.log("Already exists.");
}
