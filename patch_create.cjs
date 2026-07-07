const fs = require('fs');
let content = fs.readFileSync('pages/digital-forms/CreateAgreement.tsx', 'utf8');

const targetStr = `      let receiptData = null;
      if (paymentReceipts.length > 0) {
        const receiptDataArray = await Promise.all(paymentReceipts.map(file => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }));
        receiptData = JSON.stringify(receiptDataArray);
      }
      
      let icLicenseDataArray: string[] | undefined = undefined;
      if (icLicensePhotos.length > 0) {
        icLicenseDataArray = await Promise.all(icLicensePhotos.map(file => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }));
      }`;

const newStr = `      let receiptData = null;
      if (paymentReceipts.length > 0) {
        const receiptUrls = await Promise.all(
          paymentReceipts.map(file => uploadAgreementImage(subscriberId, file, 'receipts'))
        );
        receiptData = JSON.stringify(receiptUrls);
      }
      
      let icLicenseDataArray: string[] | undefined = undefined;
      if (icLicensePhotos.length > 0) {
        icLicenseDataArray = await Promise.all(
          icLicensePhotos.map(file => uploadAgreementImage(subscriberId, file, 'ic_license'))
        );
      }`;

content = content.replace(targetStr, newStr);
fs.writeFileSync('pages/digital-forms/CreateAgreement.tsx', content);
