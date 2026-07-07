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
    throw new Error('Payload size exceeded. Please compress your images before uploading.');
  }
};
`;

if (!content.includes('validatePayloadSize')) {
    // Insert helper near the top, after imports
    content = content.replace("import { supabase } from '../supabase';", "import { supabase } from '../supabase';\n" + sizeCheckHelper);
}

// Now insert into createAgreement
const createMatch = `  async createAgreement(agreement: Omit<Agreement, 'id' | 'created_at'>, subscriberId: string): Promise<Agreement> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      let finalAgreement: any = { ...agreement };`;

const createReplace = `  async createAgreement(agreement: Omit<Agreement, 'id' | 'created_at'>, subscriberId: string): Promise<Agreement> {
    const targetSubscriberId = await getTenantId();
    
    // Countermeasure: check size before retries
    validatePayloadSize(agreement);

    return withRetry(async () => {
      let finalAgreement: any = { ...agreement };`;

content = content.replace(createMatch, createReplace);

// Now insert into updateAgreement
const updateMatch = `  async updateAgreement(id: string, subscriberId: string | null | undefined, updates: Partial<Agreement>): Promise<void> {
    let targetSubscriberId: string | undefined;
    try {
      targetSubscriberId = await getTenantId();`;

const updateReplace = `  async updateAgreement(id: string, subscriberId: string | null | undefined, updates: Partial<Agreement>): Promise<void> {
    // Countermeasure: check size before retries
    validatePayloadSize(updates);

    let targetSubscriberId: string | undefined;
    try {
      targetSubscriberId = await getTenantId();`;

content = content.replace(updateMatch, updateReplace);

fs.writeFileSync('services/apiService.ts', content);
console.log("Patched apiService.ts with size limits");
