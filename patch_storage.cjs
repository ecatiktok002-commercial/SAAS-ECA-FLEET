const fs = require('fs');
let content = fs.readFileSync('services/storageService.ts', 'utf8');

const search = `export const uploadAgreementImage = async (subscriberId: string, file: File, folder: string): Promise<string> => {
  const compressedFile = await compressVehicleImage(file);`;

const replace = `export const uploadAgreementImage = async (subscriberId: string, file: File, folder: string): Promise<string> => {
  // IC/License need to be clear. We will bypass heavy compression for them.
  let finalFile = file;
  if (folder !== 'ic_license') {
      finalFile = await compressVehicleImage(file);
  }`;

if (content.indexOf(search) !== -1) {
    content = content.replace(search, replace);
    fs.writeFileSync('services/storageService.ts', content);
    console.log("Patched storageService.ts successfully");
} else {
    console.log("Could not find search string in storageService.ts");
}
