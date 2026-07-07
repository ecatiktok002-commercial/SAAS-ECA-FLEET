const fs = require('fs');
let content = fs.readFileSync('pages/digital-forms/EditAgreement.tsx', 'utf8');

const targetStr1 = `        const newReceiptDataArray = await Promise.all(paymentReceipts.map(file => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }));`;

const newStr1 = `        const newReceiptDataArray = await Promise.all(paymentReceipts.map(file => uploadAgreementImage(subscriberId, file, 'receipts')));`;

const targetStr2 = `        const newIcLicenseDataArray = await Promise.all(icLicensePhotos.map(file => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }));`;

const newStr2 = `        const newIcLicenseDataArray = await Promise.all(icLicensePhotos.map(file => uploadAgreementImage(subscriberId, file, 'ic_license')));`;

content = content.replace(targetStr1, newStr1).replace(targetStr2, newStr2);
fs.writeFileSync('pages/digital-forms/EditAgreement.tsx', content);
