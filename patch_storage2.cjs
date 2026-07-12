const fs = require('fs');
let content = fs.readFileSync('services/storageService.ts', 'utf8');

const search = `  const path = \`\${subscriberId}/agreements/\${folder}/\${fileName}\`;
  const { data, error } = await supabase.storage
    .from('handover_images')
    .upload(path, compressedFile, { cacheControl: '3600', upsert: false });`;

const replace = `  const path = \`\${subscriberId}/agreements/\${folder}/\${fileName}\`;
  const { data, error } = await supabase.storage
    .from('handover_images')
    .upload(path, finalFile, { cacheControl: '3600', upsert: false });`;

if (content.indexOf(search) !== -1) {
    content = content.replace(search, replace);
    fs.writeFileSync('services/storageService.ts', content);
    console.log("Patched storageService.ts successfully (part 2)");
} else {
    console.log("Could not find search string in storageService.ts (part 2)");
}
